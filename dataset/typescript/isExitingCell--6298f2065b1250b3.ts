import type { TableMap, TableMapValue } from '../types'

export default (table_map: TableMap, cell_value: TableMapValue, direction: 'backward' | 'forward') => {
	if (!table_map.length) return false

	const first_cell = table_map[0][0]
	const last_cell = table_map[table_map.length - 1][table_map[0].length - 1]
	const { start_column, start_row } = cell_value

	if (direction === 'backward') {
		return start_column === first_cell.start_column && start_row === first_cell.start_row
	}

	return start_column === last_cell.start_column && start_row === last_cell.start_row
}
