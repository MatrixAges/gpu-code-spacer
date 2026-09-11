import { $getSelection, $isRangeSelection } from 'lexical'

import { $computeTableMap, $getNodeTriplet, $isTableSelection, $moveSelectionToCell } from './index'

import type TableSelection from '../TableSelection'

export default () => {
	const selection = $getSelection() as TableSelection

	if (!$isRangeSelection(selection) && !$isTableSelection(selection)) return

	const anchor = selection.anchor.getNode()
	const focus = selection.focus.getNode()
	const [anchor_cell, , grid] = $getNodeTriplet(anchor)
	const [focus_cell] = $getNodeTriplet(focus)
	const [grid_map, anchor_cell_map, focus_cell_map] = $computeTableMap(grid, anchor_cell, focus_cell)
	const { start_column: anchor_start_column } = anchor_cell_map
	const { start_row: focus_start_row, start_column: focus_start_column } = focus_cell_map
	const start_column = Math.min(anchor_start_column, focus_start_column)
	const end_column = Math.max(
		anchor_start_column + anchor_cell.__col_span - 1,
		focus_start_column + focus_cell.__col_span - 1
	)
	const selected_column_count = end_column - start_column + 1
	const column_count = grid_map[0].length

	if (column_count === end_column - start_column + 1) {
		grid.selectPrevious()
		grid.remove()

		return
	}

	const row_count = grid_map.length

	for (let row = 0; row < row_count; row++) {
		for (let column = start_column; column <= end_column; column++) {
			const { cell, start_column: cell_start_column } = grid_map[row][column]

			if (cell_start_column < start_column) {
				if (column === start_column) {
					const overflow_left = start_column - cell_start_column

					cell.setColSpan(
						cell.__col_span - Math.min(selected_column_count, cell.__col_span - overflow_left)
					)
				}
			} else if (cell_start_column + cell.__col_span - 1 > end_column) {
				if (column === end_column) {
					const in_selected_area = end_column - cell_start_column + 1

					cell.setColSpan(cell.__col_span - in_selected_area)
				}
			} else {
				cell.remove()
			}
		}
	}
	const focus_row_map = grid_map[focus_start_row]
	const next_column = focus_row_map[focus_start_column + focus_cell.__col_span]

	if (next_column !== undefined) {
		const { cell } = next_column

		$moveSelectionToCell(cell)
	} else {
		const previous_row = focus_row_map[focus_start_column - 1]
		const { cell } = previous_row

		$moveSelectionToCell(cell)
	}
}
