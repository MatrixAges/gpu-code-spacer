import { $getNodeByKey, $normalizeSelection__EXPERIMENTAL, isCurrentlyReadOnlyMode, BaseSelection } from 'lexical'
import { uniqWith } from 'lodash-es'

import { $getMatchingParent } from '@/Editor/utils'

import { $computeTableMap, $getTableCellNodeRect, $isTableCellNode, $isTableSelection } from './utils'

import type { TableMapValue } from './types'
import type { ElementNode, LexicalNode, NodeKey, PointType } from 'lexical'
import type TableNode from './TableNode'
import type TableCellNode from './TableCellNode'

export default class TableSelection implements BaseSelection {
	table_key: NodeKey
	anchor: PointType
	focus: PointType
	dirty: boolean
	_cachedNodes: Array<LexicalNode> | null

	constructor(table_key: NodeKey, anchor: PointType, focus: PointType) {
		this.table_key = table_key
		this.anchor = anchor
		this.focus = focus
		this.dirty = false
		this._cachedNodes = null

		anchor._selection = this
		focus._selection = this
	}

	clone() {
		return new TableSelection(this.table_key, this.anchor, this.focus)
	}

	is(selection: TableSelection) {
		if (!$isTableSelection(selection)) return false

		return (
			this.table_key === selection.table_key &&
			this.anchor.is(selection.anchor) &&
			this.focus.is(selection.focus)
		)
	}

	set(table_key: NodeKey, anchor_cell_key: NodeKey, focus_cell_key: NodeKey) {
		this.table_key = table_key
		this.anchor.key = anchor_cell_key
		this.focus.key = focus_cell_key
		this.dirty = true
		this._cachedNodes = null
	}

	isBackward() {
		return this.focus.isBefore(this.anchor)
	}

	isCollapsed() {
		return false
	}

	getStartEndPoints(): [PointType, PointType] {
		return [this.anchor, this.focus]
	}

	getCachedNodes() {
		return this._cachedNodes
	}

	setCachedNodes(nodes: LexicalNode[]) {
		this._cachedNodes = nodes
	}

	extract() {
		return this.getNodes()
	}

	insertText() {}
	insertRawText() {}

	insertNodes(nodes: Array<LexicalNode>) {
		const focus_node = this.focus.getNode()

		const selection = $normalizeSelection__EXPERIMENTAL(
			focus_node.select(0, (focus_node as ElementNode).getChildrenSize())
		)

		selection.insertNodes(nodes)
	}

	getShape() {
		const anchor_cell_node = $getNodeByKey(this.anchor.key)! as TableCellNode
		const anchor_cell_node_rect = $getTableCellNodeRect(anchor_cell_node)!
		const focus_cell_node = $getNodeByKey(this.focus.key)! as TableCellNode
		const focus_cell_node_rect = $getTableCellNodeRect(focus_cell_node)!
		const start_x = Math.min(anchor_cell_node_rect.column_index, focus_cell_node_rect.column_index)
		const start_y = Math.min(anchor_cell_node_rect.row_index, focus_cell_node_rect.row_index)
		const stop_x = Math.max(anchor_cell_node_rect.column_index, focus_cell_node_rect.column_index)
		const stop_y = Math.max(anchor_cell_node_rect.row_index, focus_cell_node_rect.row_index)

		const merge_node_type =
			anchor_cell_node_rect.row_index >= focus_cell_node_rect.row_index &&
			anchor_cell_node_rect.column_index >= focus_cell_node_rect.column_index
				? 'focus'
				: 'anchor'
		return {
			merge_node_type,
			from_x: Math.min(start_x, stop_x),
			from_y: Math.min(start_y, stop_y),
			to_x: Math.max(start_x, stop_x),
			to_y: Math.max(start_y, stop_y)
		} as const
	}

	getNodes(): Array<LexicalNode> {
		const cached_nodes = this._cachedNodes

		if (cached_nodes) return cached_nodes

		const anchor_node = this.anchor.getNode()
		const focus_node = this.focus.getNode()
		const anchor_cell = $getMatchingParent(anchor_node, $isTableCellNode) as TableCellNode
		const focus_cell = $getMatchingParent(focus_node, $isTableCellNode) as TableCellNode

		const anchor_row = anchor_cell.getParent()!
		const table_node = anchor_row.getParent() as TableNode

		const focus_cell_grid = focus_cell.getParents()[1]

		if (focus_cell_grid !== table_node) {
			if (!table_node.isParentOf(focus_cell)) {
				const grid_parent = table_node.getParent()!

				this.set(this.table_key, grid_parent.getKey(), focus_cell.getKey())
			} else {
				const focus_cell_parent = focus_cell_grid.getParent()!

				this.set(this.table_key, focus_cell.getKey(), focus_cell_parent.getKey())
			}

			return this.getNodes()
		}

		const [map, cell_a_map, cell_b_map] = $computeTableMap(table_node, anchor_cell, focus_cell)

		let min_column = Math.min(cell_a_map.start_column, cell_b_map.start_column)
		let min_row = Math.min(cell_a_map.start_row, cell_b_map.start_row)
		let explored_min_column = min_column
		let explored_min_row = min_row
		let explored_max_column = min_column
		let explored_max_row = min_row

		let max_row = Math.max(
			cell_a_map.start_row + cell_a_map.cell.__row_span - 1,
			cell_b_map.start_row + cell_b_map.cell.__row_span - 1
		)

		let max_column = Math.max(
			cell_a_map.start_column + cell_a_map.cell.__col_span - 1,
			cell_b_map.start_column + cell_b_map.cell.__col_span - 1
		)

		const expandBoundary = (map_value: TableMapValue) => {
			const { cell, start_column: cell_start_column, start_row: cell_start_row } = map_value

			min_column = Math.min(min_column, cell_start_column)
			min_row = Math.min(min_row, cell_start_row)
			max_row = Math.max(max_row, cell_start_row + cell.__row_span - 1)
			max_column = Math.max(max_column, cell_start_column + cell.__col_span - 1)
		}

		while (
			min_column < explored_min_column ||
			min_row < explored_min_row ||
			max_column > explored_max_column ||
			max_row > explored_max_row
		) {
			if (min_column < explored_min_column) {
				const row_diff = explored_max_row - explored_min_row
				const previous_column = explored_min_column - 1

				for (let i = 0; i <= row_diff; i++) {
					expandBoundary(map[explored_min_row + i][previous_column])
				}

				explored_min_column = previous_column
			}

			if (min_row < explored_min_row) {
				const column_diff = explored_max_column - explored_min_column
				const previous_row = explored_min_row - 1

				for (let i = 0; i <= column_diff; i++) {
					expandBoundary(map[previous_row][explored_min_column + i])
				}

				explored_min_row = previous_row
			}

			if (max_column > explored_max_column) {
				const row_diff = explored_max_row - explored_min_row
				const next_column = explored_max_column + 1

				for (let i = 0; i <= row_diff; i++) {
					expandBoundary(map[explored_min_row + i][next_column])
				}

				explored_max_column = next_column
			}

			if (max_row > explored_max_row) {
				const column_diff = explored_max_column - explored_min_column
				const next_row = explored_max_row + 1

				for (let i = 0; i <= column_diff; i++) {
					expandBoundary(map[next_row][explored_min_column + i])
				}

				explored_max_row = next_row
			}
		}

		const nodes: Array<LexicalNode> = [table_node, ...table_node.getParents()]

		for (let i = max_row; i >= min_row; i--) {
			for (let j = max_column; j >= min_column; j--) {
				const { cell } = map[i][j]

				nodes.unshift(cell)
			}
		}

		const target_nodes = uniqWith(nodes, (a: LexicalNode, b: LexicalNode) => a.getKey() === b.getKey())

		if (!isCurrentlyReadOnlyMode()) {
			this._cachedNodes = target_nodes
		}

		return target_nodes
	}

	getTextContent() {
		const nodes = this.getNodes()
		let text_content = ''

		for (let i = 0; i < nodes.length; i++) {
			text_content += nodes[i].getTextContent()
		}

		return text_content
	}
}
