import type { ElementNode, LexicalNode } from 'lexical'

export default (parent: ElementNode, node: LexicalNode) => {
	const first_child = parent.getFirstChild()

	if (first_child !== null) {
		first_child.insertBefore(node)
	} else {
		parent.append(node)
	}
}
