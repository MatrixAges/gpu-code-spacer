import { $isLineBreakNode } from 'lexical'

import { $isCodeTextNode, findNextNonBlankInLine } from './index'

import type { LexicalNode, LineBreakNode, TabNode } from 'lexical'
import type CodeTextNode from '../CodeTextNode'

export default (anchor: LexicalNode, offset: number) => {
	let last: { node: CodeTextNode | TabNode | LineBreakNode; offset: number } | null = null
	let last_non_blank: null | { node: CodeTextNode; offset: number } = null
	let node: CodeTextNode | TabNode | LineBreakNode | LexicalNode = anchor
	let node_offset = offset
	let node_text_content = anchor.getTextContent()

	while (true) {
		if (node_offset === 0) {
			node = node.getPreviousSibling()!

			if (node === null) {
				break
			}

			if ($isLineBreakNode(node)) {
				last = {
					node,
					offset: 1
				}

				break
			}

			node_offset = Math.max(0, node.getTextContentSize() - 1)
			node_text_content = node.getTextContent()
		} else {
			node_offset--
		}

		const character = node_text_content[node_offset]

		if ($isCodeTextNode(node) && character !== ' ') {
			last_non_blank = {
				node: node as CodeTextNode,
				offset: node_offset
			}
		}
	}

	if (last_non_blank !== null) {
		return last_non_blank
	}

	let code_character_at_anchor_offset = null

	if (offset < anchor.getTextContentSize()) {
		if ($isCodeTextNode(anchor)) {
			code_character_at_anchor_offset = anchor.getTextContent()[offset]
		}
	} else {
		const next_sibling = anchor.getNextSibling()!

		if ($isCodeTextNode(next_sibling)) {
			code_character_at_anchor_offset = next_sibling.getTextContent()[0]
		}
	}

	if (code_character_at_anchor_offset !== null && code_character_at_anchor_offset !== ' ') {
		return last
	} else {
		const next_non_blank = findNextNonBlankInLine(anchor, offset)

		if (next_non_blank !== null) {
			return next_non_blank
		} else {
			return last
		}
	}
}
