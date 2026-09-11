import { App } from './app'

import type { DirTree } from './schema/dirtree_items'

export namespace Stack {
	export interface View {
		id: DirTree.Item['id']
		module: App.ModuleType
		file: DirTree.Item
		active: boolean
		fixed: boolean
		top?: boolean
	}

	export interface Column {
		views: Array<View>
		width: number
	}

	export type Columns = Array<Column>

	export interface Position {
		column: number
		view: number
	}
}
