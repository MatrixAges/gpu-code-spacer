import { $setImportNode, ElementNode } from 'lexical'

import { $convertTableRowElement, $createTableRowNode } from './utils'

import type { DOMConversionMap, NodeKey, SerializedElementNode } from 'lexical'

export default class TableRowNode extends ElementNode {
	constructor(key?: NodeKey) {
		super(key)
	}

	static getType(): string {
		return 'table_row'
	}

	static clone(node: TableRowNode, new_key?: boolean) {
		return new TableRowNode(new_key ? undefined : node.__key)
	}

	static importDOM(): DOMConversionMap {
		return { tr: () => ({ conversion: $convertTableRowElement, priority: 0 }) }
	}

	static importJSON(serializedNode: SerializedElementNode, update?: boolean) {
		const node = $createTableRowNode(serializedNode.key)

		if (!update) $setImportNode(serializedNode.key, node)

		return node
	}

	createDOM() {
		const el = document.createElement('tr')

		el.className = '__editor_table_tr'

		return el
	}

	exportJSON() {
		return { ...super.exportJSON(), type: 'table_row' }
	}

	updateDOM() {
		return false
	}

	isShadowRoot() {
		return true
	}

	canBeEmpty() {
		return true
	}

	canIndent() {
		return false
	}
}
