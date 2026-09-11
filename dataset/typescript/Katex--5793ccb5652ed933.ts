import KatexNode from '@/Editor/plugins/Katex/Node'
import { $createKatexNode, $isKatexNode } from '@/Editor/plugins/Katex/utils'
import { insertBlock } from '@/Editor/utils'

import type { TextMatchTransformer, ElementTransformer } from '@lexical/markdown'
import type { LexicalNode } from 'lexical'

export const Katex_inline = {
	type: 'text-match',
	regExp: /(?<!\$)\$\s*([^$]+?)\s*\$$/,
	importRegExp: /(?<!\$)\$\s*([^$]+?)\s*\$/,
	trigger: '$',
	dependencies: [KatexNode],
	export(node: LexicalNode) {
		if (!$isKatexNode(node)) return null

		return `$ ${(node as KatexNode).__value} $`
	},
	replace(node, match) {
		const [, value] = match

		node.replace($createKatexNode({ value, inline: true }))
	}
} as TextMatchTransformer

export const Katex_block = {
	type: 'element',
	regExp: /\$\$\s*([^$]+?)\s*\$\$\s{0,1}$/,
	dependencies: [KatexNode],
	export(node: LexicalNode) {
		if (!$isKatexNode(node)) return null

		return `$$ ${(node as KatexNode).__value} $$`
	},
	replace(parent, _children, match, is_import) {
		const node = $createKatexNode({ value: match[1], inline: false })

		if (is_import) {
			parent.replace(node)
		} else {
			insertBlock(node)
		}
	}
} as ElementTransformer
