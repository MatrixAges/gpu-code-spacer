import Node from '../CodeTextNode'

import type { LexicalNode } from 'lexical'

export default (node: LexicalNode | null | undefined) => {
	return node instanceof Node
}
