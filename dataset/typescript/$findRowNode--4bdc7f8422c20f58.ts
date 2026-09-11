import { $findMatchingParent } from '@lexical/utils'

import { $isTableRowNode } from './index'

import type { LexicalNode } from 'lexical'
import type TableRowNode from '../TableRowNode'

export default (node: LexicalNode) => {
	const row_node = $findMatchingParent(node, $isTableRowNode)!

	return ($isTableRowNode(row_node) ? row_node : null) as TableRowNode
}
