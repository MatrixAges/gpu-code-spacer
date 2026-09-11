import type { LexicalNode } from 'lexical'

export default (n: LexicalNode) => {
	let node = n
	let parent = node.getParent()

	while (parent) {
		if (parent.__type === 'root') {
			break
		}

		node = parent
		parent = node.getParent()
	}

	return node
}
