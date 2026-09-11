import { $getSelection, $isRangeSelection } from 'lexical'

import { $computeTableMap, $getNodeTriplet, $insertFirst, $isTableSelection, $moveSelectionToCell } from './index'

import type TableSelection from '../TableSelection'
import type TableRowNode from '../TableRowNode'

export default () => {
	const selection = $getSelection() as TableSelection

	if (!$isRangeSelection(selection) && !$isTableSelection(selection)) return

	const anchor = selection.anchor.getNode()
	const focus = selection.focus.getNode()
	const [anchor_cell, , grid] = $getNodeTriplet(anchor)
	const [focus_cell] = $getNodeTriplet(focus)
	const [grid_map, anchor_cell_map, focus_cell_map] = $computeTableMap(grid, anchor_cell, focus_cell)
	const { start_row: anchor_start_row } = anchor_cell_map
	const { start_row: focus_start_row } = focus_cell_map
	const focus_end_row = focus_start_row + focus_cell.__row_span - 1

	if (grid_map.length === focus_end_row - anchor_start_row + 1) {
		grid.remove()

		return
	}

	const column_count = grid_map[0].length
	const next_row = grid_map[focus_end_row + 1]
	const next_row_node: TableRowNode = grid.getChildAtIndex(focus_end_row + 1)!

	for (let row = focus_end_row; row >= anchor_start_row; row--) {
		for (let column = column_count - 1; column >= 0; column--) {
			const { cell, start_row: cell_start_row, start_column: cell_start_column } = grid_map[row][column]

			if (cell_start_column !== column) {
				continue
			}

			if (row === anchor_start_row && cell_start_row < anchor_start_row) {
				cell.setRowSpan(cell.__row_span - (cell_start_row - anchor_start_row))
			}

			if (cell_start_row >= anchor_start_row && cell_start_row + cell.__row_span - 1 > focus_end_row) {
				cell.setRowSpan(cell.__row_span - (focus_end_row - cell_start_row + 1))

				if (column === 0) {
					$insertFirst(next_row_node, cell)
				} else {
					const { cell: previous_cell } = next_row[column - 1]

					previous_cell.insertAfter(cell)
				}
			}
		}

		const row_node = grid.getChildAtIndex(row)!

		row_node.remove()
	}
	if (next_row !== undefined) {
		const { cell } = next_row[0]

		$moveSelectionToCell(cell)
	} else {
		const previous_row = grid_map[anchor_start_row - 1]
		const { cell } = previous_row[0]

		$moveSelectionToCell(cell)
	}
}
