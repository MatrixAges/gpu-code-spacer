import { $isTabNode } from 'lexical'

import { $isCodeTextNode } from './index'

import type { LexicalNode } from 'lexical'

export default (anchor: LexicalNode) => {
	let previousNode = anchor
	let node = anchor

	while ($isCodeTextNode(node) || $isTabNode(node)) {
		previousNode = node
		node = node.getPreviousSibling()!
	}

	return previousNode
}
