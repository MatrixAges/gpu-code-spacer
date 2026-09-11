import {
	$getEditor,
	$getNearestNodeFromDOMNode,
	$getSelection,
	$isRangeSelection,
	$setImportNode,
	ElementNode
} from 'lexical'

import { $getMatchingParent } from '@/Editor/utils'
import { isHTMLElement } from '@lexical/utils'

import { $computeTableMap, $convertTableElement, $createTableNode, $isTableCellNode, $isTableNode } from './utils'

import type TableRowNode from './TableRowNode'
import type TableCellNode from './TableCellNode'
import type { Table, IPropsTableNode, SerializedTableNode, IPropsTableCol } from './types'
import type { DOMConversionMap, DOMExportOutput, LexicalEditor } from 'lexical'

export default class TableNode extends ElementNode {
	__cols = {} as IPropsTableNode['cols']

	constructor(props: IPropsTableNode) {
		const { cols, node_key } = props

		super(node_key)

		if (cols) this.__cols = cols
	}

	static getType() {
		return 'table'
	}

	static clone(node: TableNode, new_key?: boolean) {
		return new TableNode({ cols: node.__cols, node_key: new_key ? undefined : node.__key })
	}

	static importDOM(): DOMConversionMap {
		return { table: () => ({ conversion: $convertTableElement, priority: 0 }) }
	}

	static importJSON(serializedNode: SerializedTableNode, update?: boolean) {
		const node = $createTableNode({ cols: serializedNode.cols, node_key: serializedNode.key })

		if (!update) $setImportNode(serializedNode.key, node)

		return node
	}

	createDOM() {
		const el = document.createElement('table')

		el.className = '__editor_table __editor_block'

		const col_keys = Object.keys(this.__cols!)

		if (col_keys.length) {
			const editor = $getEditor()
			const rows = this.getChildren() as Array<TableRowNode>

			col_keys.forEach(key => {
				const target_key = Number(key)
				const target_value = this.__cols![target_key]

				const row = rows[target_key]

				if (row) {
					const cells = row.getChildren() as Array<TableCellNode>

					cells.forEach((item, index) => {
						if (target_key !== index) return

						const el = editor.getElementByKey(item.getKey()) as HTMLTableCellElement

						if (el && target_value.align) el.setAttribute('align', target_value.align)
						if (el && target_value.width) el.setAttribute('width', String(target_value.width))
					})
				}
			})
		}

		return el
	}

	updateDOM() {
		return false
	}

	exportDOM(editor: LexicalEditor): DOMExportOutput {
		return {
			...super.exportDOM(editor),
			after: el => {
				if (el) {
					const new_el = el.cloneNode() as ParentNode
					const col_group = document.createElement('colgroup')
					const t_body = document.createElement('tbody') as any

					if (isHTMLElement(el)) {
						t_body.append(...(el.children as HTMLCollection & Iterable<HTMLTableElement>))
					}

					const first_row = this.getFirstChildOrThrow<TableRowNode>()

					for (let i = 0; i < first_row.getChildrenSize(); i++) {
						const col = document.createElement('col')

						col_group.append(col as unknown as string)
					}

					new_el.replaceChildren(col_group, t_body)

					return new_el as HTMLElement
				}
			}
		}
	}

	exportJSON(): SerializedTableNode {
		return { ...super.exportJSON(), type: 'table', cols: this.__cols }
	}

	canBeEmpty() {
		return false
	}

	isShadowRoot() {
		return true
	}

	canSelectBefore() {
		return true
	}

	canIndent() {
		return false
	}

	cloneCol(col_index: number) {
		const target = this.getWritable()
		const col_value = target.__cols![col_index]

		target.__cols![col_index + 1] = col_value
	}

	updateCol(col_index: number, v: IPropsTableCol) {
		const target = this.getWritable()
		const col_value = target.__cols![col_index]

		if (col_value) {
			target.__cols![col_index] = { ...col_value, ...v }
		} else {
			target.__cols![col_index] = v
		}
	}

	resetColAttr(col_index: number, attr: 'align' | 'width') {
		const target = this.getWritable()

		if (!target.__cols![col_index]?.[attr]) return

		if (Object.keys(target.__cols![col_index]).length === 1) {
			delete target.__cols![col_index]
		} else {
			delete target.__cols![col_index][attr]
		}
	}

	resetCols() {
		const editor = $getEditor()
		const rows = this.getChildren() as Array<TableRowNode>

		rows.forEach(row => {
			const cells = row.getChildren() as Array<TableCellNode>

			cells.forEach(item => {
				const el = editor.getElementByKey(item.getKey()) as HTMLTableCellElement

				if (!el) return

				if (el.hasAttribute('align')) el.removeAttribute('align')
				if (el.hasAttribute('width')) el.removeAttribute('width')
			})
		})
	}

	existRowspan() {
		const rows = this.getChildren() as Array<TableRowNode>

		return rows.some(row => row.getChildren().some(((cell: TableCellNode) => cell.getRowSpan() > 1) as any))
	}

	existColspan() {
		const rows = this.getChildren() as Array<TableRowNode>

		return rows.some(row => row.getChildren().some(((cell: TableCellNode) => cell.getColSpan() > 1) as any))
	}

	existLargeRowspan() {
		const selection = $getSelection()

		if (!$isRangeSelection(selection)) return

		const anchor = selection.anchor.getNode()
		const table_node = $getMatchingParent(anchor, $isTableNode) as TableNode
		const table_cell_node = $getMatchingParent(anchor, $isTableCellNode) as TableCellNode

		if (!table_node) return

		const [table_map, table_node_map] = $computeTableMap(table_node, table_cell_node, null!)
		const { start_row } = table_node_map

		if (table_cell_node.getRowSpan() > 1) return true

		const target_row = table_map[start_row]

		return target_row.some(({ cell }) => cell.getRowSpan() > 1)
	}

	existLargeColspan() {
		const selection = $getSelection()

		if (!$isRangeSelection(selection)) return

		const anchor = selection.anchor.getNode()
		const table_node = $getMatchingParent(anchor, $isTableNode) as TableNode
		const table_cell_node = $getMatchingParent(anchor, $isTableCellNode) as TableCellNode

		if (!table_node) return

		const [table_map, table_node_map] = $computeTableMap(table_node, table_cell_node, null!)
		const { start_column } = table_node_map

		if (table_cell_node.getColSpan() > 1) return true

		let target = false

		table_map.forEach(row_map => {
			row_map.forEach((cell_map, col_index) => {
				const { cell } = cell_map

				if (start_column === col_index) {
					if (cell.getColSpan() > 1) {
						target = true
					}
				}
			})
		})

		return target
	}

	getCordsFromCellNode(table_cell_node: TableCellNode, table: Table) {
		const { rows, row_counts } = table

		for (let y = 0; y < row_counts; y++) {
			const row = rows[y]

			if (row == null) {
				continue
			}

			const x = row.findIndex(cell => {
				if (!cell) return

				const { el } = cell
				const node = $getNearestNodeFromDOMNode(el)

				return node === table_cell_node
			})

			if (x !== -1) {
				return { x, y }
			}
		}
	}

	getDOMCellFromCords(x: number, y: number, table: Table) {
		const { rows } = table

		const row = rows[y]

		if (row == null) return null

		const cell = row[x]

		if (cell == null) return null

		return cell
	}

	getCellNodeFromCords(x: number, y: number, table: Table) {
		const cell = this.getDOMCellFromCords(x, y, table)

		if (!cell) return null

		const node = $getNearestNodeFromDOMNode(cell.el)!

		if ($isTableCellNode(node)) return node as TableCellNode

		return null
	}
}
