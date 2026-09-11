import type {
	DBKV,
	DBDirtreeItems,
	DBModuleSetting,
	DBTodoItems,
	DBNoteItems,
	DBPomoItems,
	DBScheduleItems
} from '@/schemas'
import type { RxDatabase } from 'rxdb'
import type { RxDocument, RxQuery, CRDTDocumentField, RxCollection } from 'rxdb'

export namespace RxDB {
	export type WithCRDTs<RxDocType> = RxDocType & {
		crdts?: CRDTDocumentField<RxDocType>
	}

	export type RxCollectionWithFunctions<T> = RxCollection<
		T,
		{},
		{
			clean(primary_value: string | number): Promise<void>
			getRemovedItems<T = any>(): Promise<T[]>
			bulkClean(primary_values?: Array<string | number>): Promise<void>
		}
	>

	export type DBContent = RxDatabase<{
		kv: DBKV
		module_setting: DBModuleSetting
		dirtree_items: DBDirtreeItems
		todo_items: DBTodoItems
		note_items: DBNoteItems
		pomo_items: DBPomoItems
		schedule_items: DBScheduleItems
	}>

	export type ItemsDoc<T> = Array<RxDocument<T>>
	export type ItemsQuery<T> = RxQuery<T, ItemsDoc<T>>
	export type SortType = 'asc' | 'desc'
}
