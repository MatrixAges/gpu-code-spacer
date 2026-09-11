import dayjs from 'dayjs'
import { Workbook } from 'exceljs'
import { groupBy } from 'lodash-es'
import { makeAutoObservable } from 'mobx'
import { match } from 'ts-pattern'
import { injectable } from 'tsyringe'

import { KVSettingsModel, ModuleSettingsModel, Utils } from '@/models'
import { getTimeBlocks } from '@/modules/schedule/services'
import { getCrossTime, getMonthDays } from '@/modules/schedule/utils'
import { downloadExcel, getDocItemsData } from '@/utils'
import getEditorText from '@/utils/getEditorText'
import { setStorageWhenChange } from '@openages/stk/mobx'

import type { MangoQuerySelector } from 'rxdb'
import type { Schedule, Tray } from '@/types'
import type { IPropsList } from './types'
import type { DayDetail } from '@/modules/schedule/utils'
import type { Dayjs } from 'dayjs'

@injectable()
export default class Index {
	id = ''
	use_by_tray = false
	tray_settings = null as KVSettingsModel<Tray.Setting> | null
	list_duration = 'day' as 'day' | 'week' | 'month' | 'year' | 'custom'
	list_current_text = dayjs().format('YYYY-MM-DD')
	list_current_date = dayjs()
	list_custom_duration = null as [string, string] | null
	list_items = [] as Array<Schedule.Item>

	visible_calendar = true
	calendar_month = dayjs()
	calendar_month_text = dayjs().format('YYYY-MM')
	days = [] as Array<DayDetail>

	get tags() {
		return this.settings?.settings?.tags || []
	}

	get todo_file_id() {
		return this.tray_settings?.settings?.todo?.file_id
	}

	get todo_angle_id() {
		return this.tray_settings?.settings?.todo?.angle_id
	}

	get schedule_file_id() {
		return this.tray_settings?.settings?.schedule?.file_id
	}

	constructor(
		public utils: Utils,
		public settings: ModuleSettingsModel<Schedule.Setting>
	) {
		makeAutoObservable(
			this,
			{
				utils: false,
				settings: false,
				tray_settings: false,
				id: false,
				use_by_tray: false,
				list_current_date: false,
				calendar_month: false
			},
			{ autoBind: true }
		)
	}

	async init(args: Pick<IPropsList, 'id' | 'use_by_tray' | 'setToggleCalendarHandler'>) {
		const { id, use_by_tray, setToggleCalendarHandler } = args

		this.utils.acts.push(
			setStorageWhenChange([{ [`ScheduleList_visible_calendar`]: 'visible_calendar' }], this)
		)

		this.id = id

		if (use_by_tray && setToggleCalendarHandler) {
			this.use_by_tray = this.use_by_tray

			setToggleCalendarHandler(this.toggleCalenadr)

			this.getDays()
		}

		this.settings.init(id)

		this.setListDuration()
	}

	setListDuration(v?: Index['list_duration'], ignore_date?: boolean) {
		if (!ignore_date) this.list_current_date = dayjs()

		if (v) {
			this.list_duration = v
		} else {
			v = this.list_duration
		}

		if (v === 'custom') {
			this.list_items = []

			return
		}

		this.list_custom_duration = null

		this.list_current_text = match(v)
			.with('day', () => this.list_current_date.format('YYYY-MM-DD'))
			.with('week', () => this.list_current_date.format('YYYY [W]W'))
			.with('month', () => this.list_current_date.format('YYYY-MM'))
			.with('year', () => this.list_current_date.format('YYYY'))
			.exhaustive()

		const start = this.list_current_date.startOf(v).valueOf()
		const end = this.list_current_date.endOf(v).valueOf()

		this.getListItems([start, end])
	}

	listStep(type: 'prev' | 'next') {
		this.list_current_date = this.list_current_date[type === 'prev' ? 'subtract' : 'add'](
			1,
			this.list_duration as Exclude<Index['list_duration'], 'custom'>
		)

		this.setListDuration(this.list_duration, true)
	}

	setListCustomDuration(v: Index['list_custom_duration']) {
		this.list_custom_duration = v

		if (v) {
			const start = dayjs(v[0]).startOf('day').valueOf()
			const end = dayjs(v[1]).endOf('day').valueOf()

			this.getListItems([start, end])
		} else {
			this.list_items = []
		}
	}

	toggleCalenadr() {
		this.visible_calendar = !this.visible_calendar
	}

	getDays() {
		this.days = getMonthDays(this.calendar_month)
	}

	changeCurrentDate(v: Dayjs) {
		this.list_current_date = v
		this.list_current_text = v.format('YYYY-MM-DD')

		this.setListDuration(this.list_duration, true)
	}

	changeCalendarMonth(type: 'prev' | 'next' | 'current') {
		this.calendar_month =
			type === 'current' ? dayjs() : this.calendar_month[type === 'prev' ? 'subtract' : 'add'](1, 'month')

		this.calendar_month_text = this.calendar_month.format('YYYY-MM')

		this.getDays()
	}

	async exportListToExcel() {
		if (!this.list_items.length) return

		const timeline_angles = this.settings?.settings?.timeline_angles || []

		const { timeline = [], calendar = [] } = groupBy($copy(this.list_items), 'type')

		const target_items = [] as Array<{
			text: string
			tag: string
			duration: string
			cross_time: string
			belong: string
		}>

		timeline.concat(calendar).forEach(item => {
			const start = dayjs(item.start_time)
			const end = dayjs(item.end_time)
			const target_tag = this.tags.find(it => item.tag === it.id)
			const target_timeline_angle = timeline_angles.find(it => item.timeline_angle_id === it.id)

			let duration
			let cross_time

			if (item.type === 'timeline') {
				const days = end.diff(start, 'hours') / 24
				duration = `${start.format('MM.DD')} - ${end.format('MM.DD')}`
				cross_time = `${days}${$t('common.time.d')}`
			} else {
				duration = `${start.format('YYYY-MM-DD HH:mm')} - ${end.format('HH:mm')}`
				cross_time = getCrossTime(start, end)
			}

			target_items.push({
				text: item.text,
				tag: target_tag?.text || '',
				duration,
				cross_time,
				belong: target_timeline_angle?.text || ''
			})
		})

		const workbook = new Workbook()
		const worksheet = workbook.addWorksheet($t('modules.schedule'))

		const headers = (['text', 'tag', 'duration', 'cross_time', 'belong'] as const).map(i =>
			$t(`schedule.exportListToExcel.${i}`)
		)

		worksheet.addRow(headers)
		worksheet.addRows(target_items.map(item => Object.values(item)))

		headers.forEach((_, index) => {
			const column = index + 1

			let width = 12

			if (column === 1) width = 45
			if (column === 3) width = 21
			if (column === 5) width = 18

			worksheet.getColumn(column).width = width
		})

		const buffer = await workbook.xlsx.writeBuffer()

		downloadExcel(`${this.list_current_text}`, buffer)
	}

	async getListItems(v: [number, number]) {
		const [start, end] = v
		const selector: MangoQuerySelector<Schedule.Item> = {}

		selector['$or'] = [
			{
				start_time: { $gte: start },
				end_time: { $lte: end + 1 }
			},
			{
				start_time: { $lt: start },
				end_time: { $gt: start }
			},
			{
				start_time: { $lt: end + 1 },
				end_time: { $gt: end + 1 }
			}
		]

		const items = await getTimeBlocks(this.id, selector, []).sort({ start_time: 'desc' }).exec()

		this.list_items = getDocItemsData(items).map(item => {
			item.text = getEditorText(item.text)

			return item
		})
	}

	off() {
		this.utils.off()
		this.settings.off()
	}
}
