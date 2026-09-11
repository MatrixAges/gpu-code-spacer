import Node from '../ToggleBodyNode'

import type { LexicalNode } from 'lexical'

export default (node: LexicalNode | null | undefined) => {
	return node instanceof Node
}
