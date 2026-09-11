import { $getSelection, $isLineBreakNode, $isRangeSelection, $isTabNode, KEY_ARROW_UP_COMMAND, TextNode } from 'lexical'

import { $isCodeTextNode, $isSelectionInCode, getFirstCodeNodeOfLine, getLastCodeNodeOfLine } from './index'

import type { LexicalCommand, LexicalNode } from 'lexical'

export default (type: LexicalCommand<KeyboardEvent>, event: KeyboardEvent): boolean => {
	const selection = $getSelection()

	if (!$isRangeSelection(selection)) return false

	const { anchor, focus } = selection
	const anchor_offset = anchor.offset
	const focus_offset = focus.offset
	const anchor_node = anchor.getNode()
	const focus_node = focus.getNode()
	const arrow_is_up = type === KEY_ARROW_UP_COMMAND

	if (
		!$isSelectionInCode(selection) ||
		!($isCodeTextNode(anchor_node) || $isTabNode(anchor_node)) ||
		!($isCodeTextNode(focus_node) || $isTabNode(focus_node))
	) {
		return false
	}

	if (!event.altKey) {
		if (selection.isCollapsed()) {
			const code_node = anchor_node.getParentOrThrow()

			if (arrow_is_up && anchor_offset === 0 && anchor_node.getPreviousSibling() === null) {
				const code_node_sibling = code_node.getPreviousSibling()

				if (code_node_sibling === null) {
					code_node.selectPrevious()
					event.preventDefault()

					return true
				}
			} else if (
				!arrow_is_up &&
				anchor_offset === anchor_node.getTextContentSize() &&
				anchor_node.getNextSibling() === null
			) {
				const code_node_sibling = code_node.getNextSibling()

				if (code_node_sibling === null) {
					code_node.selectNext()
					event.preventDefault()
					return true
				}
			}
		}

		return false
	}

	let start: LexicalNode
	let end: LexicalNode

	if (anchor_node.isBefore(focus_node)) {
		start = getFirstCodeNodeOfLine(anchor_node)
		end = getLastCodeNodeOfLine(focus_node)
	} else {
		start = getFirstCodeNodeOfLine(focus_node)
		end = getLastCodeNodeOfLine(anchor_node)
	}

	if (start == null || end == null) {
		return false
	}

	const range = start.getNodesBetween(end)

	for (let i = 0; i < range.length; i++) {
		const node = range[i]

		if (!$isCodeTextNode(node) && !$isTabNode(node) && !$isLineBreakNode(node)) {
			return false
		}
	}

	event.preventDefault()
	event.stopPropagation()

	const linebreak = arrow_is_up ? start.getPreviousSibling() : end.getNextSibling()

	if (!$isLineBreakNode(linebreak)) return true

	const sibling = arrow_is_up ? linebreak.getPreviousSibling() : linebreak.getNextSibling()

	if (sibling == null) return true

	const is_target_node = $isCodeTextNode(sibling) || $isTabNode(sibling) || $isLineBreakNode(sibling)
	const codeline = arrow_is_up ? getFirstCodeNodeOfLine(sibling) : getLastCodeNodeOfLine(sibling)
	const maybe_insertion_point = is_target_node ? codeline : null

	let insertion_point = maybe_insertion_point != null ? maybe_insertion_point : sibling

	linebreak.remove()

	range.forEach(node => node.remove())

	if (type === KEY_ARROW_UP_COMMAND) {
		range.forEach(node => insertion_point.insertBefore(node))

		insertion_point.insertBefore(linebreak)
	} else {
		insertion_point.insertAfter(linebreak)
		insertion_point = linebreak

		range.forEach(node => {
			insertion_point.insertAfter(node)
			insertion_point = node
		})
	}

	selection.setTextNodeRange(anchor_node as TextNode, anchor_offset, focus_node as TextNode, focus_offset)

	return true
}
