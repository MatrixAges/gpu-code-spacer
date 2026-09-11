import { $isElementNode } from 'lexical'

import { $findMatchingParent } from '@lexical/utils'

import type { LexicalNode } from 'lexical'

export default (type: string, offset: number, anchor_node: LexicalNode, direction: 'backward' | 'forward') => {
	const exiting_table_element_anchor =
		type === 'element' &&
		(direction === 'backward'
			? anchor_node.getPreviousSibling() === null
			: anchor_node.getNextSibling() === null)

	let exiting_table_text_anchor: boolean

	const parent_node = $findMatchingParent(anchor_node, n => $isElementNode(n) && !n.isInline())

	if (!parent_node) {
		exiting_table_text_anchor = false
	} else {
		const has_valid_offset =
			direction === 'backward' ? offset === 0 : offset === anchor_node.getTextContentSize()

		exiting_table_text_anchor =
			type === 'text' &&
			has_valid_offset &&
			(direction === 'backward'
				? parent_node.getPreviousSibling() === null
				: parent_node.getNextSibling() === null)
	}

	return exiting_table_element_anchor || exiting_table_text_anchor
}
