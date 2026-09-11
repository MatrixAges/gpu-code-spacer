import type { LexicalEditor } from 'lexical'

import type TableNode from '../TableNode'
import type TableRowNode from '../TableRowNode'
import type TableCellNode from '../TableCellNode'

export default (editor: LexicalEditor, node: TableNode) => {
	const cols = node.getLatest().__cols!
	const rows = node.getChildren() as Array<TableRowNode>

	rows.forEach(row => {
		const cells = row.getChildren() as Array<TableCellNode>

		cells.forEach((item, index) => {
			const col_value = cols[index]
			const el = editor.getElementByKey(item.getKey()) as HTMLTableCellElement

			if (!el) return

			if (!col_value) {
				if (el.hasAttribute('align')) el.removeAttribute('align')
				if (el.hasAttribute('width')) el.removeAttribute('width')

				return
			}

			if (col_value.align) {
				if (col_value.align !== el.getAttribute('align')) {
					el.setAttribute('align', col_value.align)
				}
			} else {
				el.removeAttribute('align')
			}

			if (col_value.width) {
				if (String(col_value.width) !== el.getAttribute('width')) {
					el.setAttribute('width', String(col_value.width))
				}
			} else {
				el.removeAttribute('width')
			}
		})
	})
}
