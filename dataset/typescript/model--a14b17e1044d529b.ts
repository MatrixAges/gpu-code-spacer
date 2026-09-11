import type { DirTree } from '@/types'
import type { SortableData } from '@dnd-kit/sortable'

export type MoveData = SortableData & {
	parent_index: Array<number>
	item: DirTree.Item
}
