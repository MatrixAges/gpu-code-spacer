import type { Todo, Tag } from '@/types'
import type { Dayjs } from 'dayjs'

export type Mode = 'list' | 'kanban' | 'table' | 'mindmap' | 'flat' | 'quad'
export type AnalysisDuration = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface AnalysisTrending {
	dates: Array<string>
	create: Array<number>
	done: Array<number>
	uncheck: Array<number>
	close: Array<number>
}

export interface KanbanItems {
	[key: string]: {
		dimension: { type: 'angle'; value: Todo.Angle } | { type: 'tag'; value: Tag }
		items: Array<Todo.Todo>
		loaded?: boolean
	}
}

export interface QuadItems {
	[level: string]: Array<Todo.Todo>
}

export interface CurrentDetailIndex {
	id: string
	index: number
	dimension_id?: string
}

export interface CurrentDetailItem {
	item: Todo.Todo
	prev_id?: string
	next_id?: string
}

export type ItemsSortType = 'importance' | 'alphabetical' | 'create_at'

export type ItemsSortParams = {
	type: ItemsSortType | 'done_time'
	order: 'asc' | 'desc'
}

export type ArchiveQueryParams = {
	angle_id?: string
	tags?: Array<string>
	begin_date?: Dayjs
	end_date?: Dayjs
	status?: 'unchecked' | 'closed'
}

export type Indexes = { index?: number; children_index?: number; dimension_id?: string }

export type ArgsCheck = Indexes & { status: Todo.Todo['status'] }

export type ArgsUpdate =
	| (Indexes & { type: 'parent'; value: Partial<Omit<Todo.TodoItem, 'id'>> })
	| (Indexes & { type: 'close'; value: Partial<Omit<Todo.TodoItem, 'id'>> })
	| (Indexes & { type: 'unclose'; value: Partial<Omit<Todo.TodoItem, 'id'>> })
	| (Indexes & { type: 'archive'; value: Partial<Omit<Todo.TodoItem, 'id'>> })
	| (Indexes & { type: 'children'; value: Todo.Todo['children'] })
	| (Indexes & { type: 'children_item'; value: Partial<Omit<Required<Todo.Todo>['children'][number], 'id'>> })
	| (Indexes & { type: 'insert_children_item'; value: any })
	| (Indexes & { type: 'remove_children_item'; value: any })

export type ArgsMove = { active: Indexes; over: Indexes }

export type ArgsInsert = Indexes & { data?: Todo.Todo; callback?: () => any }

export type ArgsTab = (Indexes & { type: 'in' }) | (Indexes & { type: 'out'; children_index: number })

export type ArgsRemove = Indexes & { id: string; callback?: () => any }
