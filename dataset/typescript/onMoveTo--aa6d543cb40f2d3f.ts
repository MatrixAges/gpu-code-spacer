import { $getSelection, $isLineBreakNode, $isRangeSelection, $isTabNode, MOVE_TO_START } from 'lexical'

import CodeTextNode from '../CodeTextNode'
import { $isCodeTextNode, $isSelectionInCode, getLastCodeNodeOfLine, getStartOfCodeInLine } from './index'

import type { LexicalCommand } from 'lexical'

export default (type: LexicalCommand<KeyboardEvent>, event: KeyboardEvent): boolean => {
	const selection = $getSelection()

	if (!$isRangeSelection(selection)) return false

	const { anchor, focus } = selection
	const anchor_node = anchor.getNode()
	const focus_node = focus.getNode()
	const is_move_to_start = type === MOVE_TO_START

	if (
		!$isSelectionInCode(selection) ||
		!($isCodeTextNode(anchor_node) || $isTabNode(anchor_node)) ||
		!($isCodeTextNode(focus_node) || $isTabNode(focus_node))
	) {
		return false
	}

	if (is_move_to_start) {
		const start = getStartOfCodeInLine(focus_node, focus.offset)

		if (start !== null) {
			const { node, offset } = start
			if ($isLineBreakNode(node)) {
				node.selectNext(0, 0)
			} else {
				selection.setTextNodeRange(node, offset, node, offset)
			}
		} else {
			focus_node.getParentOrThrow().selectStart()
		}
	} else {
		const node = getLastCodeNodeOfLine(focus_node) as CodeTextNode

		node.select()
	}

	event.preventDefault()
	event.stopPropagation()

	return true
}
