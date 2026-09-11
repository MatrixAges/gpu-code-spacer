import { $isLineBreakNode } from 'lexical'

import { $isCodeTextNode } from './index'

import type { LexicalNode } from 'lexical'
import type CodeTextNode from '../CodeTextNode'

export default (anchor: LexicalNode, offset: number) => {
	let node = anchor
	let node_offset = offset
	let node_text_content = anchor.getTextContent()
	let node_text_content_size = anchor.getTextContentSize()

	while (true) {
		if (!$isCodeTextNode(node) || node_offset === node_text_content_size) {
			node = node.getNextSibling()!
			if (node === null || $isLineBreakNode(node)) {
				return null
			}
			if ($isCodeTextNode(node)) {
				node_offset = 0
				node_text_content = node.getTextContent()
				node_text_content_size = node.getTextContentSize()
			}
		}
		if ($isCodeTextNode(node)) {
			if (node_text_content[node_offset] !== ' ') {
				return {
					node: node as CodeTextNode,
					offset: node_offset
				}
			}
			node_offset++
		}
	}
}
