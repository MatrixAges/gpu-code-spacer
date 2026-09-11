import type { Cell, CellNode } from '../types'

export default (n: HTMLElement) => {
	let node = n as CellNode

	while (node != null) {
		const nodeName = node.nodeName

		if (nodeName === 'TD' || nodeName === 'TH') {
			const cell = node._cell

			if (!cell) return null

			return cell as Cell
		}

		node = node.parentNode as CellNode
	}

	return null
}
