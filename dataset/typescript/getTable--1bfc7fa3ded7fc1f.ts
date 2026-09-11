import type { Rows, CellNode } from '../types'

export default (el: HTMLElement) => {
	const rows: Rows = []
	const table = { rows, row_counts: 0, col_counts: 0 }

	let current_node = el.firstChild as unknown as CellNode
	let x = 0
	let y = 0

	rows.length = 0

	while (current_node != null) {
		const node_name = current_node.nodeName

		if (node_name === 'TD' || node_name === 'TH') {
			const el = current_node
			const cell = { el, x, y }

			current_node._cell = cell

			let row = rows[y]
			if (row === undefined) {
				row = rows[y] = []
			}

			row[x] = cell
		} else {
			const child = current_node.firstChild as unknown as CellNode

			if (child != null) {
				current_node = child

				continue
			}
		}

		const sibling = current_node.nextSibling as unknown as CellNode

		if (sibling != null) {
			x++

			current_node = sibling

			continue
		}

		const parent = current_node.parentNode

		if (parent != null) {
			const parent_sibling = parent.nextSibling as unknown as CellNode

			if (parent_sibling == null) {
				break
			}

			y++

			x = 0
			current_node = parent_sibling
		}
	}

	table.col_counts = x + 1
	table.row_counts = y + 1

	return table
}
