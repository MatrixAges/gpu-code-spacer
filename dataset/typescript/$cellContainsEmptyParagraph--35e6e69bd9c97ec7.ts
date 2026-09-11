import { $isParagraphNode } from 'lexical'

import type TableCellNode from '../TableCellNode'

export default (cell: TableCellNode) => {
	if (cell.getChildrenSize() !== 1) return false

	const firstChild = cell.getFirstChildOrThrow()

	if (!$isParagraphNode(firstChild) || !firstChild.isEmpty()) {
		return false
	}

	return true
}
