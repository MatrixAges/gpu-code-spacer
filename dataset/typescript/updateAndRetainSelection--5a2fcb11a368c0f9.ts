import { $getNodeByKey, $getSelection, $isLineBreakNode, $isRangeSelection, $isTextNode } from 'lexical'

import CodeNode from '../CodeNode'
import { $isCodeNode } from './index'

export default (node_key: string, update_fn: () => boolean) => {
	const node = $getNodeByKey(node_key) as CodeNode
	const selection = $getSelection()

	if (!$isCodeNode(node) || !node.isAttached()) return

	if (!$isRangeSelection(selection)) {
		update_fn()

		return
	}

	const anchor = selection.anchor
	const anchor_offset = anchor.offset
	const is_new_line_anchor = anchor.type === 'element' && $isLineBreakNode(node.getChildAtIndex(anchor_offset - 1))

	let text_offset = 0

	if (!is_new_line_anchor) {
		const anchor_node = anchor.getNode()

		text_offset =
			anchor_offset +
			anchor_node.getPreviousSiblings().reduce((offset, _node) => offset + _node.getTextContentSize(), 0)
	}

	if (!update_fn()) return
	if (is_new_line_anchor) return anchor.getNode().select(anchor_offset, anchor_offset)

	node.getChildren().some(_node => {
		const is_text = $isTextNode(_node)

		if (is_text || $isLineBreakNode(_node)) {
			const text_content_size = _node.getTextContentSize()

			if (is_text && text_content_size >= text_offset) {
				_node.select(text_offset, text_offset)

				return true
			}

			text_offset -= text_content_size
		}

		return false
	})
}
