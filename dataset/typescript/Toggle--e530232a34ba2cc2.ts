import ToggleNode from '../plugins/Toggle/ToggleNode'
import {
	$createToggleBodyNode,
	$createToggleBtnNode,
	$createToggleHeadNode,
	$createToggleNode,
	$isToggleNode
} from '../plugins/Toggle/utils'
import { $convertFromMarkdownString, $convertToMarkdownString } from '../utils'
import transformers from './'

import type { ElementTransformer } from '@lexical/markdown'
import type ToggleHeadNode from '../plugins/Toggle/ToggleHeadNode'
import type ToggleBodyNode from '../plugins/Toggle/ToggleBodyNode'
import type { LexicalNode } from 'lexical'

export const Toggle_import = {
	type: 'element',
	regExp: /<details[^>]*>/,
	dependencies: [ToggleNode],
	export() {
		return null
	},
	replace(parent, _children, _match, is_import) {
		if (!is_import) return

		let text = parent.getTextContent()

		const [_, summary] = text.match(/<summary>(.*?)<\/summary>/)!

		text = text.replace(/<summary>(.*?)<\/summary>/, '')

		const btn = $createToggleBtnNode()
		const head = $createToggleHeadNode()
		const body = $createToggleBodyNode()

		$convertFromMarkdownString(summary, transformers, head, false)
		$convertFromMarkdownString(text, transformers, body, false)

		const node = $createToggleNode({ open: true }).append(btn, head, body)

		parent.replace(node)
	}
} as ElementTransformer

export const Toggle_export = {
	type: 'element',
	regExp: new RegExp(''),
	dependencies: [ToggleNode],
	export(node: LexicalNode) {
		if (!$isToggleNode(node)) return null

		const [_, head_node, body_node] = (node as ToggleNode).getChildren()

		const head_node_text = $convertToMarkdownString(transformers, head_node as ToggleHeadNode, true)
		const body_node_text = $convertToMarkdownString(transformers, body_node as ToggleBodyNode, false)

		return `<details>
<summary>${head_node_text}</summary>
${body_node_text}
</details>`
	},
	replace() {
		return null
	}
} as ElementTransformer
