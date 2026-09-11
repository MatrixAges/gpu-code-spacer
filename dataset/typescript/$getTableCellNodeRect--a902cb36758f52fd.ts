import { $getNodeTriplet } from './index'

import type TableRowNode from '../TableRowNode'
import type TableCellNode from '../TableCellNode'

export default (table_cell_node: TableCellNode) => {
	const [cell_node, , grid_node] = $getNodeTriplet(table_cell_node)
	const rows = grid_node.getChildren<TableRowNode>()
	const row_count = rows.length
	const column_count = rows[0].getChildren().length
	const cell_matrix = new Array(row_count)

	for (let i = 0; i < row_count; i++) {
		cell_matrix[i] = new Array(column_count)
	}

	for (let row_index = 0; row_index < row_count; row_index++) {
		const row = rows[row_index]
		const cells = row.getChildren<TableCellNode>()
		let column_index = 0

		for (let cell_index = 0; cell_index < cells.length; cell_index++) {
			while (cell_matrix[row_index][column_index]) {
				column_index++
			}

			const cell = cells[cell_index]
			const row_span = cell.__row_span || 1
			const col_span = cell.__col_span || 1

			for (let i = 0; i < row_span; i++) {
				for (let j = 0; j < col_span; j++) {
					cell_matrix[row_index + i][column_index + j] = cell
				}
			}

			if (cell_node === cell) {
				return {
					col_span,
					column_index,
					row_index,
					row_span
				}
			}

			column_index += col_span
		}
	}

	return null
}
