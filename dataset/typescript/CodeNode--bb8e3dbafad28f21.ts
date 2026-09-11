import {
	$createLineBreakNode,
	$createParagraphNode,
	$createTabNode,
	$isTabNode,
	$isTextNode,
	$setImportNode,
	ElementNode
} from 'lexical'

import { getLangName, shiki_langs } from '@/Editor/utils'

import {
	$createCodeNode,
	$createCodeTextNode,
	$isCodeNode,
	$isCodeTextNode,
	convertCodeElement,
	getCodeTokenNodes,
	getFirstCodeNodeOfLine
} from './utils'

import type { IPropsCode, SerializedCodeNode } from './types'
import type { BundledLanguage } from 'shiki'
import type { DOMExportOutput, RangeSelection, DOMConversionMap } from 'lexical'

export default class CodeNode extends ElementNode {
	__lang: BundledLanguage

	constructor(props: IPropsCode) {
		const { lang = 'js', node_key } = props

		super(node_key)

		let target = getLangName(lang)

		if (!shiki_langs[target]) target = 'javascript'

		this.__lang = target as BundledLanguage
	}

	static getType() {
		return 'code'
	}

	static clone(node: CodeNode, new_key?: boolean) {
		return new CodeNode({ lang: node.__lang, node_key: new_key ? undefined : node.__key })
	}

	static importDOM(): DOMConversionMap {
		return { code: () => ({ conversion: convertCodeElement, priority: 0 }) }
	}

	static importJSON(serializedNode: SerializedCodeNode, update?: boolean) {
		const node = $createCodeNode({ lang: serializedNode.lang, node_key: serializedNode.key })

		if (!update) $setImportNode(serializedNode.key, node)

		return node
	}

	createDOM() {
		const el = document.createElement('code')

		el.className = '__editor_code __editor_block __editor_block_special'

		el.setAttribute('spellcheck', 'false')
		el.setAttribute('data-lang', shiki_langs[this.__lang]?.name || 'javascript')

		return el
	}

	exportDOM(): DOMExportOutput {
		const el = document.createElement('pre')

		el.setAttribute('spellcheck', 'false')
		el.setAttribute('lexical-code-lang', this.__lang)

		return { element: el }
	}

	updateDOM(prev: CodeNode, el: HTMLElement) {
		if (prev.__lang !== this.__lang) {
			el.setAttribute('data-lang', shiki_langs[this.__lang].name)
		}

		return false
	}

	exportJSON(): SerializedCodeNode {
		return {
			...super.exportJSON(),
			type: 'code',
			lang: this.__lang
		}
	}

	appendTextToTokens(text: string) {
		const token_nodes = getCodeTokenNodes(text, this.__lang)

		super.append(...token_nodes)
	}

	insertNewAfter(selection: RangeSelection, restoreSelection = true) {
		const children = this.getChildren()
		const children_length = children.length

		if (
			children_length >= 2 &&
			children[children_length - 1].getTextContent() === '\n' &&
			children[children_length - 2].getTextContent() === '\n' &&
			selection.isCollapsed() &&
			selection.anchor.key === this.__key &&
			selection.anchor.offset === children_length
		) {
			children[children_length - 1].remove()
			children[children_length - 2].remove()

			const node = $createParagraphNode()

			this.insertAfter(node, restoreSelection)

			return node
		}

		const { anchor, focus } = selection
		const first_point = anchor.isBefore(focus) ? anchor : focus
		const first_selection_node = first_point.getNode()

		if ($isTextNode(first_selection_node)) {
			let node = getFirstCodeNodeOfLine(first_selection_node)

			const insert_nodes = []

			while (true) {
				if ($isTabNode(node)) {
					insert_nodes.push($createTabNode())
					node = node.getNextSibling()!
				} else if ($isCodeTextNode(node)) {
					let spaces = 0

					const text = node.getTextContent()
					const textSize = node.getTextContentSize()

					while (spaces < textSize && text[spaces] === ' ') {
						spaces++
					}

					if (spaces !== 0) {
						insert_nodes.push($createCodeTextNode({ text: ' '.repeat(spaces) }))
					}

					if (spaces !== textSize) {
						break
					}

					node = node.getNextSibling()!
				} else {
					break
				}
			}

			const split = first_selection_node.splitText(anchor.offset)[0]
			const x = anchor.offset === 0 ? 0 : 1
			const index = split.getIndexWithinParent() + x
			const code_node = first_selection_node.getParentOrThrow()
			const nodes_to_insert = [$createLineBreakNode(), ...insert_nodes]

			code_node.splice(index, 0, nodes_to_insert)

			const last = insert_nodes[insert_nodes.length - 1]

			if (last) {
				last.select()
			} else if (anchor.offset === 0) {
				split.selectPrevious()
			} else {
				split.getNextSibling()!.selectNext(0, 0)
			}
		}

		if ($isCodeNode(first_selection_node)) {
			const { offset } = selection.anchor
			const target = first_selection_node as CodeNode

			target.splice(offset, 0, [$createLineBreakNode()])
			target.select(offset + 1, offset + 1)
		}

		return null
	}

	canIndent() {
		return false
	}

	collapseAtStart() {
		const selected = window.getSelection()?.toString().trim().length

		if (selected) return false

		const paragraph = $createParagraphNode()
		const children = this.getChildren()

		children.forEach(child => paragraph.append(child))

		this.replace(paragraph)

		return true
	}
}
