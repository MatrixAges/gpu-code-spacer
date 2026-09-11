import type { Tag } from '../common'

export namespace Schedule {
	export interface TimelineAngle {
		id: string
		text: string
		rows: Array<string>
	}

	export interface Setting {
		tags: Array<Tag>
		timeline_angles: Array<TimelineAngle>
	}

	export interface ScheduleSetting {
		file_id: string
		module: string
		setting: Setting
	}

	export interface Item {
		/** @maxLength 30 */
		id: string
		/** @maxLength 30 */
		file_id: string
		type: 'calendar' | 'timeline' | 'fixed'
		/** @maxLength 30 */
		tag: string
		text: string
		todos: Array<string>
		/**
		 * @multipleOf 1
		 * @minimum 1
		 * @maximum 9007199254740991
		 * */
		start_time: number
		/**
		 * @multipleOf 1
		 * @minimum 1
		 * @maximum 9007199254740991
		 * */
		end_time: number
		fixed_scale?: 'day' | 'week' | 'month' | 'year'
		/** @maxLength 30 */
		timeline_angle_id?: string
		/** @maxLength 30 */
		timeline_angle_row_id?: string
		timeline_year?: boolean
		remark?: string
		create_at?: number
		update_at?: number
		extends?: string
	}

	export type CalendarItem = Item & {
		start: number
		length: number
		past: boolean
		raw_start_time?: number
		raw_end_time?: number
	}

	export type CalendarDay = Array<CalendarItem>
	export type CalendarDays = Array<CalendarDay>
}
