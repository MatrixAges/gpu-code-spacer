import { $setImportNode, TextNode } from 'lexical'

import { $createCodeNode, $createCodeTextNode } from './utils'

import type { IPropsCodeText, SerializedCodeTextNode } from './types'
import type { EditorConfig } from 'lexical'

export default class CodeTextNode extends TextNode {
	__color: string

	constructor(props: IPropsCodeText) {
		const { text, color, node_key } = props

		super(text, node_key)

		this.__color = color!
	}

	static getType(): string {
		return 'code_text'
	}

	static clone(node: CodeTextNode, new_key?: boolean) {
		return new CodeTextNode({
			text: node.__text,
			color: node.__color,
			node_key: new_key ? undefined : node.__key
		})
	}

	static importJSON(serializedNode: SerializedCodeTextNode, update?: boolean) {
		const node = $createCodeTextNode({
			text: serializedNode.text,
			color: serializedNode.color,
			node_key: serializedNode.key
		})

		if (!update) $setImportNode(serializedNode.key!, node)

		return node
	}

	createDOM(config: EditorConfig) {
		const el = super.createDOM(config)

		el.setAttribute('style', this.__color)

		return el
	}

	updateDOM(prev: CodeTextNode, el: HTMLElement, config: EditorConfig): boolean {
		return super.updateDOM(prev, el, config)
	}

	exportJSON() {
		return {
			...super.exportJSON(),
			type: 'code_text',
			color: this.__color
		}
	}

	canHaveFormat() {
		return false
	}

	setFormat() {
		return this
	}

	isParentRequired() {
		return true
	}

	createParentElementNode() {
		return $createCodeNode({ lang: 'js' })
	}
}
