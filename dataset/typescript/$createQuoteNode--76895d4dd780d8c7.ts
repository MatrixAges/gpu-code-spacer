import { $applyNodeReplacement, $createParagraphNode } from 'lexical'

import QuoteNode from '../QuoteNode'

export default (key?: string) => {
	const node = new QuoteNode(key)

	if (!key) {
		const p = $createParagraphNode()

		node.append(p)
	}

	return $applyNodeReplacement(node) as QuoteNode
}
