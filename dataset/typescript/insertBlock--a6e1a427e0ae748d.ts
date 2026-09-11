import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical'

import { getSelectedNode } from './index'

import type { LexicalNode } from 'lexical'

export default (node: LexicalNode) => {
	const selection = $getSelection()

	if (!$isRangeSelection(selection)) return

	const selected_node = getSelectedNode(selection)

	if (selected_node.getTextContentSize()) {
		const target = selected_node.getTopLevelElement()

		if (target) {
			target.insertAfter(node)
		} else {
			selected_node.insertAfter(node)
		}
	} else {
		selected_node.replace(node)

		const next = selected_node.getNextSibling()

		if (next) {
			next.selectEnd()
		} else {
			const p = $createParagraphNode()

			node.insertAfter(p)

			p.selectStart()
		}
	}

	return true
}
