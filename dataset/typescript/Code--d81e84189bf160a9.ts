import { getLangName, shiki_langs, CODE_BLOCK_REG_EXP } from '@/Editor/utils'

import CodeNode from '../plugins/Code/CodeNode'
import { $createCodeNode, $isCodeNode } from '../plugins/Code/utils'

import type { ElementTransformer } from '@lexical/markdown'
import type { BundledLanguage } from 'shiki'

import type { LexicalNode } from 'lexical'

export default {
	type: 'element',
	regExp: CODE_BLOCK_REG_EXP,
	dependencies: [CodeNode],
	export(node: LexicalNode) {
		if (!$isCodeNode(node)) return null

		const text = node.getTextContent()

		return '```' + ((node as CodeNode).__lang || '') + (text ? '\n' + text : '') + '\n' + '```'
	},
	replace(parent, _children, match) {
		const lang = (match?.[1] ?? 'shell') as BundledLanguage
		const target = getLangName(lang)

		if (!shiki_langs[target]) return

		const node = $createCodeNode({ lang: target as BundledLanguage })

		parent.replace(node)
	}
} as ElementTransformer
