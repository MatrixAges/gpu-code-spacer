import { $findMatchingParent } from '@lexical/utils'

import TableCellNode from '../TableCellNode'
import TableNode from '../TableNode'
import TableRowNode from '../TableRowNode'
import { $isTableCellNode } from './index'

import type { PointType, LexicalNode } from 'lexical'

export default (source: PointType | LexicalNode | TableCellNode): [TableCellNode, TableRowNode, TableNode] => {
	let cell: TableCellNode

	if (source instanceof TableCellNode) {
		cell = source
	} else if ('__type' in source) {
		cell = $findMatchingParent(source, $isTableCellNode) as TableCellNode
	} else {
		cell = $findMatchingParent(source.getNode(), $isTableCellNode) as TableCellNode
	}

	const row = cell.getParent() as TableRowNode
	const grid = row.getParent() as TableNode

	return [cell, row, grid]
}
