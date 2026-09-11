import { Tag } from '../common'

export namespace Todo {
	type Relations = Array<{ items: Array<string>; checked: boolean }>

	export interface Angle {
		id: string
		text: string
	}

	export interface Setting {
		angles: Array<Angle>
		tags: Array<Tag>
		auto_archiving: '0m' | '3m' | '3h' | '1d' | '3d' | '7d'
		desc?: string
		relations?: Relations
		table_exclude_fields?: Array<string>
		exclude_angles?: Array<string>
	}

	export interface TodoSetting {
		file_id: string
		module: string
		setting: Setting
	}

	type Common = {
		/** @maxLength 30 */
		id: string
		/** @maxLength 30 */
		file_id: string
		/** @maxLength 30 */
		angle_id: string
		text: string
		sort: number
		create_at: number
		update_at?: number
	}

	export type Cycle =
		| {
				type: 'interval'
				scale?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
				value?: number
				exclude?: Array<number>
		  }
		| {
				type: 'specific'
				scale?: 'clock' | 'weekday' | 'date' | 'special'
				value?: number
				exclude?: Array<number>
		  }

	export type Todo = Common & {
		/** @maxLength 12 */
		type: 'todo'
		/** @maxLength 12 */
		status: 'checked' | 'unchecked' | 'closed'
		level?: number
		tag_ids?: Array<string>
		remind_time?: number
		cycle_enabled?: boolean
		cycle?: Cycle
		recycle_time?: number
		remark?: string
		archive: boolean
		archive_time?: number
		schedule?: boolean
		start_time?: number
		end_time?: number
		done_time?: number
		children?: Array<{
			id: string
			text: string
			status: 'checked' | 'unchecked'
		}>
		collaborators?: Array<string | number>
		extends?: string
	}

	export type Group = Common & {
		type: 'group'
	}

	export type TodoItem = Todo | Group
}
