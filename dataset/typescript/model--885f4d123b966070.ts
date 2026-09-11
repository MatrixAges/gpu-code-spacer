import { makeAutoObservable } from 'mobx'
import { domToPng } from 'modern-screenshot'
import { match } from 'ts-pattern'
import { injectable } from 'tsyringe'

import { File, KVSettingsModel, Sound } from '@/models'
import done from '@/public/sounds/done.mp3'
import notify from '@/public/sounds/notify.mp3'
import { getDocItem, id, ipc, is_electron } from '@/utils'
import { disableWatcher } from '@/utils/decorators'
import { arrayMove } from '@dnd-kit/sortable'

import { getPomo, update } from './services'
import { getGoingTime, getTime, getTimeText } from './utils'

import type { Subscription } from 'rxjs'
import type { Pomo } from '@/types'

@injectable()
export default class Index {
	id = ''
	data = {} as Pomo.Item
	ref_tray = null as HTMLDivElement | null

	watcher = null as unknown as Subscription
	disable_watcher = false

	view_index = 0
	view_direction = 0

	visible_edit_modal = false

	record_timer = null as unknown as NodeJS.Timer
	record_numbers = 0

	tray = null as { status: 'working' | 'break'; percent: number; title: string } | null

	get use_sound() {
		return this.settings.settings?.sound
	}

	constructor(
		public file: File,
		public settings: KVSettingsModel<Pomo.Setting>,
		public work_end: Sound,
		public break_end: Sound
	) {
		makeAutoObservable(
			this,
			{
				file: false,
				id: false,
				ref_tray: false,
				watcher: false,
				disable_watcher: false,
				record_timer: false,
				record_numbers: false
			},
			{ autoBind: true }
		)
	}

	init(args: { id: string }) {
		const { id } = args

		this.id = id
		this.file.init(id)
		this.settings.init('pomo_settings')

		this.work_end.init({ src: notify, loop: true, times: 6 })
		this.break_end.init({ src: done, loop: true, times: 6 })

		this.on()
	}

	@disableWatcher
	async updatePomo(v?: Partial<Pomo.Item>) {
		await update(this.id, v ?? $copy(this.data))
	}

	@disableWatcher
	async toggleGoing(v?: boolean) {
		this.data.going = v ?? !this.data.going
		this.view_index = this.data.index

		if (this.data.going) {
			if (!this.data.current) this.data.current = 'work'

			this.startRecord()
		} else {
			this.stopRecord()
		}

		await this.updatePomo()
	}

	@disableWatcher
	async toggleContinuousMode() {
		this.data.continuous_mode = !this.data.continuous_mode

		await this.updatePomo()
	}

	@disableWatcher
	async add(v: Pomo.Session) {
		this.data.sessions.push({ ...v, id: id() })

		await this.updatePomo({ sessions: $copy(this.data.sessions) })
	}

	@disableWatcher
	async update(index: number, v: Pomo.Session) {
		this.data.sessions[index] = { ...this.data.sessions[index], ...v }

		if (this.data.index === index) {
			this.data.work_in = 0
			this.data.break_in = 0
		}

		await this.updatePomo({ sessions: $copy(this.data.sessions) })
	}

	@disableWatcher
	async remove(index: number) {
		if (this.data.sessions.length === 1) return
		if (this.view_index === index) this.view_index = 0

		this.data.sessions.splice(index, 1)

		await this.updatePomo({ sessions: $copy(this.data.sessions) })
	}

	@disableWatcher
	async move(active_index: number, over_index: number) {
		this.data.sessions = arrayMove($copy(this.data.sessions), active_index, over_index)

		this.data.current = null
		this.data.going = false
		this.data.work_in = 0
		this.data.break_in = 0
		this.data.index = 0

		await this.updatePomo()
	}

	@disableWatcher
	async next() {
		const session = this.data.sessions[this.data.index]

		const goNextSession = () => {
			const next_index = this.data.index + 1
			const next_session = this.data.sessions.at(next_index)

			if (!next_session) {
				this.data.index = 0
				this.view_index = 0

				return this.updatePomo()
			}

			this.data.index = next_index
			this.view_index = next_index
		}

		const reset = (current?: Index['data']['current']) => {
			this.data.current = current ?? null
			this.data.going = false
			this.data.work_in = 0
			this.data.break_in = 0
		}

		if (this.data.going) this.stopRecord()

		if (session.flow_mode) {
			reset()
			goNextSession()

			return
		}

		match(this.data.current)
			.with(null, () => {
				goNextSession()
			})
			.with('work', () => {
				reset('break')
			})
			.with('break', () => {
				reset()
				goNextSession()
			})

		this.updatePomo()
	}

	changeViewIndex(v: number | 'left' | 'right') {
		let view_direction = -1
		let view_index = -1

		if (typeof v === 'number') {
			view_direction = v - this.view_index > 0 ? 1 : -1
			view_index = v
		} else {
			view_direction = v === 'left' ? 1 : -1
			view_index = this.view_index + view_direction
		}

		if (view_index < 0 || view_index > this.data.sessions.length - 1) return

		this.view_direction = view_direction
		this.view_index = view_index
	}

	checkCurrent() {
		const session = this.data.sessions[this.data.index]

		if (session.flow_mode) {
			session.work_time = getGoingTime(this.data.work_in)

			const time = getTime(getGoingTime(this.data.work_in), true) as { hours: number; minutes: number }
			const percent = parseFloat(((time.minutes * 100) / 60).toFixed(2))

			this.updateTray({ status: 'working', percent, title: getTimeText(session.work_time) })

			return
		}

		if (this.data.current === 'work') {
			const going_time = getGoingTime(this.data.work_in)
			const left_time = session.work_time - going_time
			const percent = parseFloat(((going_time * 100) / session.work_time).toFixed(2))

			this.updateTray({ status: 'working', percent, title: getTimeText(left_time) })
		}

		if (this.data.current === 'break') {
			const going_time = getGoingTime(this.data.break_in)
			const left_time = session.break_time - going_time
			const percent = parseFloat(((going_time * 100) / session.break_time).toFixed(2))

			this.updateTray({ status: 'break', percent, title: getTimeText(left_time) })
		}

		if (this.data.current === 'work' && getGoingTime(this.data.work_in) >= session.work_time) {
			if (this.use_sound) this.work_end.sound.play()

			this.data.current = 'break'

			this.stopRecord()
		}

		if (this.data.current === 'break' && getGoingTime(this.data.break_in) >= session.break_time) {
			if (this.use_sound) this.break_end.sound.play()

			this.data.current = null
			this.data.work_in = 0
			this.data.break_in = 0

			this.stopRecord()

			if (this.data.continuous_mode) {
				const next_index = this.data.index + 1
				const next_session = this.data.sessions.at(next_index)

				if (!next_session) return

				this.data.index = next_index

				return this.toggleGoing(true)
			}
		}
	}

	startRecord() {
		if (!this.data.current) return

		this.record_timer = setInterval(() => {
			this.record_numbers += 1

			if (this.data.current === 'work') {
				this.data.work_in += 1
			} else {
				this.data.break_in += 1
			}

			this.checkCurrent()

			if (this.record_numbers >= 9) {
				this.record_numbers = 0

				this.updatePomo()
			}
		}, 1000)
	}

	async updateTray(v: Index['tray']) {
		if (!is_electron) return

		this.tray = v

		if (!this.ref_tray) return

		const data_url = await domToPng(this.ref_tray, { quality: 1, scale: 1, width: 16, height: 16 })

		ipc.app.updateTray.query({ data_url, title: this.tray?.title || '' })
	}

	stopRecord() {
		if (is_electron) ipc.app.updateTray.query()

		this.tray = null

		if (!this.record_timer) return

		clearInterval(this.record_timer)

		this.data.going = false

		this.updatePomo()
	}

	stopWatch() {
		if (!this.watcher) return

		this.watcher?.unsubscribe?.()
		this.watcher = null as unknown as Subscription
	}

	on() {
		this.stopWatch()

		this.watcher = getPomo(this.id).$.subscribe(doc => {
			if (this.disable_watcher) return

			if (!this.data.file_id) {
				const target = getDocItem(doc!)!

				if (target) {
					this.data = target

					if (this.data?.going) this.toggleGoing(true)
				}
			}

			if (this.data.index !== this.view_index) {
				this.view_index = this.data.index
			}
		})

		$app.Event.on(`pomo/${this.id}/stopRecord`, this.stopRecord)
	}

	off() {
		this.file.off()
		this.settings.off()

		$app.Event.off(`pomo/${this.id}/stopRecord`, this.stopRecord)

		this.stopWatch()
	}
}
