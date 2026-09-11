import { $setImportNode, ElementNode } from 'lexical'

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'

import { $convertTableCellNodeElement, $createTableCellNode } from './utils'

import type { DOMConversionMap, DOMExportOutput, LexicalEditor } from 'lexical'
import type { IPropsTableCellNode, SerializedTableCellNode } from './types'

export default class TableCellNode extends ElementNode {
	__is_header: boolean
	__row_span: number = 1
	__col_span: number = 1

	constructor(props: IPropsTableCellNode) {
		const { is_header, row_span, col_span, node_key } = props

		super(node_key)

		this.__is_header = is_header!
		this.__row_span = row_span || 1
		this.__col_span = col_span || 1
	}

	static getType() {
		return 'table_cell'
	}

	static clone(node: TableCellNode, new_key?: boolean) {
		return new TableCellNode({
			is_header: node.__is_header,
			row_span: node.__row_span,
			col_span: node.__col_span,
			node_key: new_key ? undefined : node.__key
		})
	}

	static importDOM(): DOMConversionMap {
		return {
			th: () => ({ conversion: $convertTableCellNodeElement, priority: 0 }),
			td: () => ({ conversion: $convertTableCellNodeElement, priority: 0 })
		}
	}

	static importJSON(serializedNode: SerializedTableCellNode, update?: boolean) {
		const node = $createTableCellNode({
			is_header: serializedNode.is_header,
			row_span: serializedNode.row_span,
			col_span: serializedNode.col_span,
			node_key: serializedNode.key
		})

		if (!update) $setImportNode(serializedNode.key, node)

		return node
	}

	createDOM() {
		const el = document.createElement(this.__is_header ? 'th' : 'td') as HTMLTableCellElement

		el.className = `__editor_table_td${this.__is_header ? ' __editor_table_th' : ''}`

		if (this.__row_span > 1) el.rowSpan = this.__row_span
		if (this.__col_span > 1) el.colSpan = this.__col_span

		dropTargetForElements({ element: el })

		return el
	}

	exportDOM(editor: LexicalEditor): DOMExportOutput {
		const { element } = super.exportDOM(editor)
		const el = element as HTMLTableCellElement

		if (this.__row_span > 1) el.rowSpan = this.__row_span
		if (this.__col_span > 1) el.colSpan = this.__col_span

		return { element: el }
	}

	exportJSON() {
		return {
			...super.exportJSON(),
			type: 'table_cell',
			is_header: this.__is_header,
			col_span: this.__col_span,
			row_span: this.__row_span
		}
	}

	getRowSpan() {
		return this.__row_span
	}

	getColSpan() {
		return this.__col_span
	}

	setRowSpan(v: number) {
		if (v === this.__row_span) return this

		this.getWritable().__row_span = v

		return this
	}

	setColSpan(v: number) {
		if (v === this.__col_span) return this

		this.getWritable().__col_span = v

		return this
	}

	updateDOM(prev_node: TableCellNode) {
		return (
			prev_node.__is_header !== this.__is_header ||
			prev_node.__row_span !== this.__row_span ||
			prev_node.__col_span !== this.__col_span
		)
	}

	isShadowRoot() {
		return true
	}

	collapseAtStart() {
		return true
	}

	canBeEmpty() {
		return false
	}

	canIndent() {
		return false
	}
}
