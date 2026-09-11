import { $copyNode, $isDecoratorNode, $isElementNode, $isParagraphNode, $isTextNode } from 'lexical'
import { $updateParagraphNodeProperties, $updateTextNodeProperties } from '@/Editor/utils'

import type { LexicalNode, ElementNode, TextNode, ParagraphNode } from 'lexical'

const Index = (node: LexicalNode) => {
	let clone_node: LexicalNode

	if ($isElementNode(node)) {
		const children = node.getChildren() as Array<LexicalNode>

		clone_node = $copyNode(node) as ElementNode

		if (children.length) {
			;(clone_node as ElementNode).append(...children.map(item => Index(item)))
		}

		if ($isParagraphNode(node)) {
			$updateParagraphNodeProperties(clone_node as ParagraphNode, node)
		}
	}

	if ($isDecoratorNode(node)) {
		clone_node = $copyNode(node)
	}

	if ($isTextNode(node)) {
		clone_node = $copyNode(node)

		$updateTextNodeProperties(clone_node as TextNode, node)
	}

	return clone_node!
}

export default Index
