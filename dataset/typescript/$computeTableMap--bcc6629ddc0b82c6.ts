import type TableNode from '../TableNode'
import type TableCellNode from '../TableCellNode'
import type TableRowNode from '../TableRowNode'
import type { TableMap, TableMapValue } from '../types'

export default (
	table: TableNode,
	cell_a: TableCellNode,
	cell_b: TableCellNode
): [TableMap, TableMapValue, TableMapValue] => {
	const table_map: TableMap = []

	let cell_a_value: TableMapValue | null = null
	let cell_b_value: TableMapValue | null = null

	const write = (start_row: number, start_column: number, cell: TableCellNode) => {
		const value = { start_row, start_column, cell } as TableMapValue
		const row_span = cell.__row_span || 1
		const col_span = cell.__col_span || 1

		for (let i = 0; i < row_span; i++) {
			if (table_map[start_row + i] === undefined) table_map[start_row + i] = []

			for (let j = 0; j < col_span; j++) {
				table_map[start_row + i][start_column + j] = value
			}
		}

		if (cell_a && cell_a.is(cell)) cell_a_value = value
		if (cell_b && cell_b.is(cell)) cell_b_value = value
	}

	const is_empty = (row: number, column: number) => {
		return table_map[row] === undefined || table_map[row][column] === undefined
	}

	const rows = table.getChildren() as Array<TableRowNode>

	for (let row_index = 0; row_index < rows.length; row_index++) {
		const row = rows[row_index] as TableRowNode
		const cells = row.getChildren()

		let col_index = 0

		for (const cell of cells) {
			while (!is_empty(row_index, col_index)) {
				col_index++
			}

			write(row_index, col_index, cell as TableCellNode)

			col_index += (cell as TableCellNode).__col_span || 1
		}
	}

	return [table_map, cell_a_value!, cell_b_value!]
}
