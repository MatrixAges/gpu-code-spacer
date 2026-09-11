import QuoteNode from '../plugins/Quote/QuoteNode'
import { $createQuoteNode, $isQuoteNode } from '../plugins/Quote/utils'
import { $convertFromMarkdownString, $convertToMarkdownString } from '../utils'
import transformers from './'

import type { ElementTransformer } from '@lexical/markdown'
import type { LexicalNode } from 'lexical'

export default {
	type: 'element',
	regExp: /^>\s/,
	dependencies: [QuoteNode],
	export(node: LexicalNode) {
		if (!$isQuoteNode(node)) return null

		const res = $convertToMarkdownString(transformers, node as QuoteNode, true)

		const lines = res.split('\n')
		const output = []

		for (const line of lines) {
			output.push('> ' + line)
		}

		return output.join('\n')
	},
	replace(parent, children, _match, is_import) {
		const node = $createQuoteNode()

		if (is_import) {
			$convertFromMarkdownString(parent.getTextContent(), transformers, node, false)

			parent.replace(node)
		} else {
			node.append(...children)
			parent.replace(node)

			node.select(0, 0)
		}
	}
} as ElementTransformer
