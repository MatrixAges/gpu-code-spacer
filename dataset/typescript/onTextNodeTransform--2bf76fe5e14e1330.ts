import { $createTextNode } from 'lexical'

import { $isCodeNode, $isCodeTextNode, onCodeNodeTransform } from './index'

import type { LexicalEditor, TextNode } from 'lexical'
import type CodeNode from '../CodeNode'

export default (node: TextNode, editor: LexicalEditor) => {
	const parentNode = node.getParent()

	if ($isCodeNode(parentNode)) {
		onCodeNodeTransform(parentNode as CodeNode, editor)
	} else if ($isCodeTextNode(node)) {
		node.replace($createTextNode(node.__text))
	}
}
