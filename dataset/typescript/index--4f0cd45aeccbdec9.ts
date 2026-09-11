import type { Schedule } from '@/types'

import type Model from '../model'

import type { RefObject } from 'react'
import type { DayDetail } from '../utils'

export interface IProps {
	id: string
}

export interface IPropsHeader {
	view: Model['view']
	scale: Model['scale']
	current: Model['current']
	visible_task_panel: Model['visible_task_panel']
	tags: Schedule.Setting['tags']
	filter_tags: Model['filter_tags']
	step: Model['step']
	toggleVisibleTaskPanel: () => boolean
	changeView: Model['changeView']
	changeScale: Model['changeScale']
	changeCurrent: Model['changeCurrent']
	showSettingsModal: () => void
	showListModal: () => void
	changeFilterTags: (v: Model['filter_tags']) => void
}

export interface IPropsHeaderLeft
	extends Pick<
		IPropsHeader,
		'view' | 'scale' | 'visible_task_panel' | 'changeView' | 'changeScale' | 'toggleVisibleTaskPanel'
	> {}

export interface IPropsHeaderCenter {
	view: Model['view']
	scale: Model['scale']
	current: Model['current']
	step: Model['step']
	changeCurrent: IPropsHeader['changeCurrent']
}

export interface IPropsHeaderRight {
	tags: Schedule.Setting['tags']
	filter_tags: Model['filter_tags']
	showSettingsModal: IPropsHeader['showSettingsModal']
	showListModal: IPropsHeader['showListModal']
	changeFilterTags: IPropsHeader['changeFilterTags']
}

export interface IPropsDateScale {
	view: Model['view']
	scale: Model['scale']
	days: Model['days']
	show_time_scale: boolean
	scrollToScanline: () => void
}

export interface IPropsDayExtra {
	item: DayDetail
}

export interface IPropsCalendarView {
	unpaid: boolean
	container: RefObject<HTMLDivElement>
	days: Model['days']
	calendar_days: Model['calendar_days']
	tags: Schedule.Setting['tags']
	move_item: Model['move_item']
	updateTimeBlock: Model['updateTimeBlock']
	removeTimeBlock: Model['removeTimeBlock']
	copyTimeBlock: (v: Omit<Schedule.CalendarItem, 'id'>) => void
	changeTimeBlockLength: Model['changeTimeBlockLength']
}

export interface IPropsCalendarViewDay {
	unpaid: boolean
	container: RefObject<HTMLDivElement>
	day_info: DayDetail
	day: Schedule.CalendarDay
	counts: number
	index: number
	tags: Schedule.Setting['tags']
	move_item?: Model['move_item']
	updateTimeBlock: Model['updateTimeBlock']
	removeTimeBlock: Model['removeTimeBlock']
	copyTimeBlock: IPropsCalendarView['copyTimeBlock']
	changeTimeBlockLength: Model['changeTimeBlockLength']
}

export interface IPropsCalendarViewTimeBlockSignal {
	item: Schedule.CalendarItem
	step?: number
	timeline?: boolean
}

export interface IPropsCalendarContextMenu {
	timeblock_copied: Model['timeblock_copied']
	addTimeBlock: Model['addTimeBlock']
}

export interface IPropsMonthView {
	view: Model['view']
	days: Model['days']
	calendar_days: Model['calendar_days']
	tags: Schedule.Setting['tags']
	updateTimeBlock: Model['updateTimeBlock']
	removeTimeBlock: Model['removeTimeBlock']
	copyTimeBlock: IPropsCalendarView['copyTimeBlock']
	jump: Model['jump']
}

export interface IPropsMonthViewDay {
	day_info: DayDetail
	day: Schedule.CalendarDay
	index: number
	tags: Schedule.Setting['tags']
	fixed_view: boolean
	updateTimeBlock: Model['updateTimeBlock']
	removeTimeBlock: Model['removeTimeBlock']
	copyTimeBlock: IPropsCalendarView['copyTimeBlock']
	jump: Model['jump']
}

export interface IPropsTimelineView {
	unpaid: boolean
	container: RefObject<HTMLDivElement>
	days: Model['days']
	setting_timeline_angles: Schedule.Setting['timeline_angles']
	timeline_rows: Model['timeline_rows']
	tags: Schedule.Setting['tags']
	move_item: Model['move_item']
	updateTimeBlock: Model['updateTimeBlock']
	removeTimeBlock: Model['removeTimeBlock']
	copyTimeBlock: IPropsCalendarView['copyTimeBlock']
	changeTimeBlockLength: Model['changeTimeBlockLength']
}

export interface IPropsTimelineViewDay {
	index: number
	counts: number
}

export interface IPropsTimelineViewRow {
	unpaid: boolean
	container: RefObject<HTMLDivElement>
	tags: Schedule.Setting['tags']
	step: number
	days_length: number
	angle_index: number
	row_index: number
	angle_id: string
	row_id: string
	timeblocks: Schedule.CalendarDay
	move_item?: Model['move_item']
	updateTimeBlock: Model['updateTimeBlock']
	removeTimeBlock: Model['removeTimeBlock']
	copyTimeBlock: IPropsCalendarView['copyTimeBlock']
	changeTimeBlockLength: Model['changeTimeBlockLength']
}

export interface IPropsTimeBlock {
	unpaid: boolean | undefined
	item: Schedule.CalendarItem
	tags: Schedule.Setting['tags']
	timeblock_index: number
	day_index?: number
	angle_row_id?: string
	month_mode?: boolean
	step?: number
	dnd_data?: any
	updateTimeBlock: Model['updateTimeBlock']
	removeTimeBlock: Model['removeTimeBlock']
	copyTimeBlock: IPropsCalendarView['copyTimeBlock']
	changeTimeBlockLength?: Model['changeTimeBlockLength']
}

export interface IPropsTimeBlockDetail {
	item: Schedule.CalendarItem
	tags: Schedule.Setting['tags']
	updateTimeBlock: Model['updateTimeBlock']
}

export interface IPropsSettingsModal {
	id: Model['id']
	visible_settings_modal: Model['visible_settings_modal']
	setting: Model['setting']['setting'] & Model['file']['data']
	closeSettingsModal: () => void
	updateSetting: Model['updateSetting']
	removeTag: Model['removeTag']
	removeTimelineAngle: Model['removeTimelineAngle']
	removeTimelineRow: Model['removeTimelineRow']
	cleanByTime: Model['cleanByTime']
}

export interface IPropsScanline {
	scanline?: RefObject<HTMLDivElement>
	timeline?: boolean
	step?: number
	start_day?: string
	scrollToScanline?: () => void
}

export interface IPropsTaskPanel {
	schedule_ids: Model['schedule_ids']
	task_panel_clear_mode: Model['task_panel_clear_mode']
	toggleTaskPanelClearMode: () => void
	updateTodoSchedule: Model['updateTodoSchedule']
}
