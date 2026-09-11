import { $setImportNode, ElementNode } from 'lexical'

import { $createToggleBodyNode, convertToggleBodyElement } from './utils'

import type { DOMConversionMap, DOMExportOutput, SerializedElementNode } from 'lexical'

export default class ToggleBodyNode extends ElementNode {
	constructor(key?: string) {
		super(key)
	}

	static getType() {
		return 'toggle_body'
	}

	static clone(node: ToggleBodyNode, new_key?: boolean) {
		return new ToggleBodyNode(new_key ? undefined : node.__key)
	}

	static importDOM(): DOMConversionMap {
		return {
			div: (dom: HTMLElement) => {
				if (!dom.hasAttribute('lexical-toggle-body')) return null

				return {
					conversion: convertToggleBodyElement,
					priority: 2
				}
			}
		}
	}

	static importJSON(serializedNode: SerializedElementNode, update?: boolean) {
		const node = $createToggleBodyNode(serializedNode.key)

		if (!update) $setImportNode(serializedNode.key, node)

		return node
	}

	createDOM() {
		const el = document.createElement('div')

		el.classList.add('__editor_toggle_body')

		return el
	}

	exportDOM(): DOMExportOutput {
		const el = document.createElement('div')

		el.classList.add('__editor_toggle_body')
		el.setAttribute('lexical-toggle-body', 'true')

		return { element: el }
	}

	updateDOM() {
		return false
	}

	exportJSON(): SerializedElementNode {
		return {
			...super.exportJSON(),
			type: 'toggle_body'
		}
	}

	isShadowRoot() {
		return true
	}
}
