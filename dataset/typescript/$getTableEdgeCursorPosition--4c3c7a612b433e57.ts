import { $findMatchingParent } from '@lexical/utils'

import { $computeTableMap, $isTableCellNode, $isTableNode } from './index'

import type TableNode from '../TableNode'
import type TableCellNode from '../TableCellNode'
import type { LexicalEditor, RangeSelection } from 'lexical'

export default (editor: LexicalEditor, selection: RangeSelection, table_node: TableNode) => {
	const table_node_parent = table_node.getParent()

	if (!table_node_parent) return

	const table_node_parent_dom = editor.getElementByKey(table_node_parent.getKey())

	if (!table_node_parent_dom) return

	const dom_selection = window.getSelection()

	if (!dom_selection || dom_selection.anchorNode !== table_node_parent_dom) return

	const anchor_cell_node = $findMatchingParent(selection.anchor.getNode(), n =>
		$isTableCellNode(n)
	) as TableCellNode

	if (!anchor_cell_node) return

	const parent_table = $findMatchingParent(anchor_cell_node, n => $isTableNode(n))!

	if (!$isTableNode(parent_table) || !parent_table.is(table_node)) return

	const [table_map, cell_value] = $computeTableMap(table_node, anchor_cell_node, anchor_cell_node)
	const first_cell = table_map[0][0]
	const last_cell = table_map[table_map.length - 1][table_map[0].length - 1]
	const { start_row, start_column } = cell_value

	const is_at_first_cell = start_row === first_cell.start_row && start_column === first_cell.start_column
	const is_at_last_cell = start_row === last_cell.start_row && start_column === last_cell.start_column

	if (is_at_first_cell) {
		return 'first'
	} else if (is_at_last_cell) {
		return 'last'
	} else {
		return
	}
}
