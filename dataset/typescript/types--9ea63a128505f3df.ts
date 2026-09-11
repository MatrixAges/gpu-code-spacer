import type { Schedule } from '@/types'

import type Model from './model'

import type { Dayjs } from 'dayjs'

export interface IPropsList {
	id: string
	use_by_tray?: boolean
	setToggleCalendarHandler?: (fn: () => void) => void
	jump?: (id: string, v: Dayjs, timeline?: boolean) => void
}

export interface IPropsHeader {
	list_duration: Model['list_duration']
	list_current_text: Model['list_current_text']
	list_custom_duration: Model['list_custom_duration']
	total: number
	setListDuration: Model['setListDuration']
	prev: () => void
	next: () => void
	setListCustomDuration: Model['setListCustomDuration']
	exportListToExcel: Model['exportListToExcel']
}

export interface IPropsCalendar {
	list_current_text: Model['list_current_text']
	calendar_month_text: Model['calendar_month_text']
	days: Model['days']
	changeCurrentDate: Model['changeCurrentDate']
	changeCalendarMonth: Model['changeCalendarMonth']
}

export interface IPropsCalendarDay {
	item: Model['days'][number]
	current: boolean
	changeCurrentDate: Model['changeCurrentDate']
}

export interface IPropsItems extends Pick<IPropsList, 'use_by_tray' | 'jump'> {
	tags: Schedule.Setting['tags']
	list_items: Model['list_items']
}

export interface IPropsItem extends Pick<IPropsList, 'jump'> {
	tags: Schedule.Setting['tags']
	item: Schedule.Item
}
