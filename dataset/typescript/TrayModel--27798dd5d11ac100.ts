import { makeAutoObservable } from 'mobx'
import { useInstanceWatch, Watch } from 'stk/dist/mobx'
import { injectable } from 'tsyringe'

import { updateModuleGlobalSetting } from '@/actions/global'
import { KVSettingsModel } from '@/models'
import Utils from '@/models/utils'
import { getFileSetting } from '@/services'
import { conf, getDocItem, getDocItemsData, is_electron } from '@/utils'

import type { DirTree, Todo, Tray } from '@/types'
import type { Subscription } from 'rxjs'
import type { KeyboardEvent, MouseEvent } from 'react'

@injectable()
export default class Index {
	visible_todo_fields = false
	visible_schedule_fields = false
	todo_files = [] as DirTree.Items
	todo_angles = [] as Array<Todo.Angle>
	schedule_files = [] as DirTree.Items
	todo_files_watcher = null as Subscription | null
	todo_angles_watcher = null as Subscription | null
	schedule_files_watcher = null as Subscription | null

	get todo_active() {
		return this.settings?.settings?.todo?.active
	}

	get schedule_active() {
		return this.settings?.settings?.schedule?.active
	}

	get todo_file_id() {
		return this.settings?.settings?.todo?.file_id
	}

	get todo_angle_id() {
		return this.settings?.settings?.todo?.angle_id
	}

	get schedule_file_id() {
		return this.settings?.settings?.schedule?.file_id
	}

	watch = {
		visible_todo_fields: v => {
			if (v) {
				this.watchTodoFiles()
				this.watchTodoAngles()
			} else {
				this.stopWatchTodoFiles()
				this.stopWatchTodoAngles()
			}
		},
		visible_schedule_fields: v => {
			if (v) {
				this.watchScheduleFiles()
			} else {
				this.stopWatchScheduleFiles()
			}
		}
	} as Watch<Index>

	constructor(
		public utils: Utils,
		public settings: KVSettingsModel<Tray.Setting>
	) {
		makeAutoObservable(
			this,
			{
				settings: false,
				todo_files_watcher: false,
				todo_angles_watcher: false,
				schedule_files_watcher: false
			},
			{ autoBind: true }
		)
	}

	async init() {
		this.utils.acts = useInstanceWatch(this)

		await this.settings.init('tray_settings')

		this.updateTrayWindowStatus()
	}

	changeTodoActive(v: boolean, e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) {
		e.stopPropagation()

		if (v && !this.visible_todo_fields) this.visible_todo_fields = true

		this.settings.settings.todo.active = v

		if (!this.todo_file_id && this.todo_files.length) {
			this.settings.settings.todo.file_id = this.todo_files[0].id
		}

		this.update()
		this.updateTrayWindowStatus()
	}

	changeScheduleActive(v: boolean, e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) {
		e.stopPropagation()

		if (v && !this.visible_schedule_fields) this.visible_schedule_fields = true

		this.settings.settings.schedule.active = v

		if (!this.schedule_file_id && this.schedule_files.length) {
			this.settings.settings.schedule.file_id = this.schedule_files[0].id
		}

		this.update()
		this.updateTrayWindowStatus()
	}

	onSelectTodoFile(v: string) {
		this.settings.settings.todo.file_id = v

		this.update()
	}

	onSelectTodoAngle(v: string) {
		this.settings.settings.todo.angle_id = v

		this.update()
	}

	onSelectScheduleFile(v: string) {
		this.settings.settings.schedule.file_id = v

		this.update()
	}

	toggleVisibleTodoFields() {
		this.visible_todo_fields = !this.visible_todo_fields
	}

	toggleVisibleScheduleFields() {
		this.visible_schedule_fields = !this.visible_schedule_fields
	}

	updateTrayWindowStatus() {
		if (!is_electron) return

		const active = this.todo_active || this.schedule_active

		conf.set('tray_window', active)
	}

	update() {
		updateModuleGlobalSetting('tray_settings', this.settings.settings as Partial<Tray.Setting>)
	}

	watchTodoFiles() {
		this.stopWatchTodoFiles()

		this.todo_files_watcher = $db.dirtree_items
			.find({ selector: { type: 'file', module: 'todo' } })
			.$.subscribe(docs => {
				this.todo_files = getDocItemsData(docs)

				if (this.todo_file_id) {
					const target = this.todo_files.find(item => item.id === this.todo_file_id)

					if (!target) {
						this.onSelectTodoFile(this.todo_files.length ? this.todo_files[0].id : '')
					}
				}
			})
	}

	stopWatchTodoFiles() {
		if (this.todo_files_watcher) this.todo_files_watcher.unsubscribe()
	}

	watchTodoAngles() {
		if (!this.todo_file_id) return

		this.stopWatchTodoAngles()

		this.todo_angles_watcher = getFileSetting(this.todo_file_id).$.subscribe(doc => {
			if (!doc) return this.onSelectTodoAngle('')

			const setting = JSON.parse(getDocItem(doc)?.setting!) as Todo.Setting

			const angles = setting?.angles || []
			const exclude_angles = setting?.exclude_angles || []
			const visible_angles = angles.filter(item => !exclude_angles.includes(item.id))

			this.todo_angles = visible_angles

			if (this.todo_angle_id) {
				const target = this.todo_angles.find(item => item.id === this.todo_angle_id)

				if (!target) {
					this.onSelectTodoAngle(this.todo_angles.length ? this.todo_angles[0].id : '')
				}
			}
		})
	}

	stopWatchTodoAngles() {
		if (this.todo_angles_watcher) this.todo_angles_watcher.unsubscribe()
	}

	watchScheduleFiles() {
		this.stopWatchScheduleFiles()

		this.schedule_files_watcher = $db.dirtree_items
			.find({ selector: { type: 'file', module: 'schedule' } })
			.$.subscribe(docs => {
				this.schedule_files = getDocItemsData(docs)

				if (this.schedule_file_id) {
					const target = this.schedule_files.find(item => item.id === this.schedule_file_id)

					if (!target) {
						this.onSelectScheduleFile(
							this.schedule_files.length ? this.schedule_files[0].id : ''
						)
					}
				}
			})
	}

	stopWatchScheduleFiles() {
		if (this.schedule_files_watcher) this.schedule_files_watcher.unsubscribe()
	}

	off() {
		this.utils.off()
		this.settings.off()

		this.stopWatchTodoFiles()
		this.stopWatchTodoAngles()
		this.stopWatchScheduleFiles()
	}
}
