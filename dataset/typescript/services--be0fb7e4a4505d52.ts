import type { App, DirTree } from '@/types'
import type { IProps } from './index'

export type ArgsInsert = {
	actions: IProps['actions']
	item: DirTree.Item
	effect_items: DirTree.Items
}

export type ArgsUpdate = {
	focusing_item?: DirTree.Item
	item: Partial<DirTree.Item>
}

export type ArgsRemove = {
	module: App.ModuleType
	focusing_item: DirTree.Item
	actions: IProps['actions']
	current_item_id: string
	remove_items: DirTree.Items
	effect_items: DirTree.Items
}
