import Node from '../TableNode'

import type { LexicalNode } from 'lexical'

export default (node: LexicalNode) => {
	return node instanceof Node
}
