import { $createParagraphNode } from 'lexical'

import { $createTableCellNode, $createTableRowNode, $isTableRowNode } from './index'

import type TableNode from '../TableNode'
import type TableCellNode from '../TableCellNode'
import type TableRowNode from '../TableRowNode'

export default (table_node: TableNode, target_index: number, should_insert_after = true, row_count: number) => {
	const table_rows = table_node.getChildren()
	const target_row_node = table_rows[target_index] as TableRowNode

	if ($isTableRowNode(target_row_node)) {
		for (let r = 0; r < row_count; r++) {
			const table_row_cells = target_row_node.getChildren<TableCellNode>()
			const table_column_count = table_row_cells.length
			const new_table_row_node = $createTableRowNode()

			for (let c = 0; c < table_column_count; c++) {
				const table_cell_node = $createTableCellNode({})

				table_cell_node.append($createParagraphNode())
				new_table_row_node.append(table_cell_node)
			}

			if (should_insert_after) {
				target_row_node.insertAfter(new_table_row_node)
			} else {
				target_row_node.insertBefore(new_table_row_node)
			}
		}
	}

	return table_node
}
