import { $isElementNode } from 'lexical'

import type { LexicalNode, SerializedElementNode } from 'lexical'

const Index = (node: LexicalNode) => {
	const json = node.exportJSON() as SerializedElementNode
	const json_children = json.children

	if ($isElementNode(node) && Array.isArray(json_children)) {
		const children = node.getChildren()

		for (let i = 0; i < children.length; i++) {
			const child_node = Index(children[i])

			json_children.push(child_node)
		}
	}

	return json
}

export default Index
