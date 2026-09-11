import { $isElementNode } from 'lexical'

import { $findMatchingParent } from '@lexical/utils'

import { $isTableNode } from './index'

import type { LexicalNode } from 'lexical'
import type TableNode from '../TableNode'

export default (anchor_node: LexicalNode, direction: 'backward' | 'forward', table_node: TableNode) => {
	const parent_node = $findMatchingParent(anchor_node, n => $isElementNode(n) && !n.isInline())

	if (!parent_node) return undefined

	const anchor_sibling = direction === 'backward' ? parent_node.getPreviousSibling() : parent_node.getNextSibling()

	if (anchor_sibling && $isTableNode(anchor_sibling)) return anchor_sibling

	return direction === 'backward' ? table_node.getPreviousSibling() : table_node.getNextSibling()
}
