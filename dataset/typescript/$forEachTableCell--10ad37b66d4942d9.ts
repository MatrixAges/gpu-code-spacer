import { $getNearestNodeFromDOMNode } from 'lexical'

import type { Table, Cell } from '../types'
import type { LexicalNode } from 'lexical'

export default (grid: Table, cb: (cell: Cell, lexical_node: LexicalNode, cords: { x: number; y: number }) => void) => {
	const { rows } = grid

	for (let y = 0; y < rows.length; y++) {
		const row = rows[y]

		if (!row) {
			continue
		}

		for (let x = 0; x < row.length; x++) {
			const cell = row[x]

			if (!cell) {
				continue
			}

			const lexical_node = $getNearestNodeFromDOMNode(cell.el)

			if (lexical_node !== null) {
				cb(cell, lexical_node, { x, y })
			}
		}
	}
}
