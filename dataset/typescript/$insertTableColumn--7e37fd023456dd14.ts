import { $createParagraphNode } from 'lexical'

import { $createTableCellNode, $isTableRowNode } from './index'

import type TableNode from '../TableNode'
import type TableRowNode from '../TableRowNode'

export default (table_node: TableNode, target_index: number, should_insert_after = true, column_count: number) => {
	const table_rows = table_node.getChildren()

	const table_cells_to_be_inserted = []
	for (let row_index = 0; row_index < table_rows.length; row_index++) {
		const current_table_row_node = table_rows[row_index] as TableRowNode

		if ($isTableRowNode(current_table_row_node)) {
			for (let column_index = 0; column_index < column_count; column_index++) {
				const table_row_children = current_table_row_node.getChildren()
				const target_cell = table_row_children[target_index]

				const new_table_cell = $createTableCellNode({})

				new_table_cell.append($createParagraphNode())

				table_cells_to_be_inserted.push({ new_table_cell, target_cell })
			}
		}
	}

	table_cells_to_be_inserted.forEach(({ new_table_cell, target_cell }) => {
		if (should_insert_after) {
			target_cell.insertAfter(new_table_cell)
		} else {
			target_cell.insertBefore(new_table_cell)
		}
	})

	return table_node
}
