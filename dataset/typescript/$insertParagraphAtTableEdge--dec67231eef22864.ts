import { $createParagraphNode } from 'lexical'

import type TableNode from '../TableNode'
import type { LexicalNode } from 'lexical'

export default (edge_position: 'first' | 'last', table_node: TableNode, children?: Array<LexicalNode>) => {
	const paragraph_node = $createParagraphNode()

	if (edge_position === 'first') {
		table_node.insertBefore(paragraph_node)
	} else {
		table_node.insertAfter(paragraph_node)
	}

	paragraph_node.append(...(children || []))
	paragraph_node.selectEnd()
}
