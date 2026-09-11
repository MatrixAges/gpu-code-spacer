import {
	$createParagraphNode,
	$createRangeSelection,
	$createTextNode,
	$getNearestNodeFromDOMNode,
	$getNodeByKey,
	$getRoot,
	$getSelection,
	$isElementNode,
	$setSelection,
	SELECTION_CHANGE_COMMAND
} from 'lexical'

import { getDomSelection } from '@/Editor/utils'

import TableCellNode from './TableCellNode'
import TableSelection from './TableSelection'
import { $createTableSelection, $isTableCellNode, $updateTableCols, getTable } from './utils'

import type { Cell, Table } from './types'
import type { ElementNode, LexicalEditor, NodeKey, TextFormatType } from 'lexical'
import type TableNode from './TableNode'

export default class TableObserver {
	editor: LexicalEditor
	table: Table
	focus_x: number
	focus_y: number
	anchor_x: number
	anchor_y: number
	table_node_key: NodeKey
	anchor_cell_node_key: NodeKey
	focus_cell_node_key: NodeKey
	anchor_cell: Cell
	focus_cell: Cell
	table_selection: TableSelection
	selecting: boolean
	listeners: Set<() => void>

	constructor(editor: LexicalEditor, table_node_key: string) {
		this.editor = editor
		this.table = { rows: [], row_counts: 0, col_counts: 0 }
		this.anchor_x = -1
		this.anchor_y = -1
		this.focus_x = -1
		this.focus_y = -1
		this.table_node_key = table_node_key
		this.anchor_cell_node_key = null!
		this.focus_cell_node_key = null!
		this.anchor_cell = null!
		this.focus_cell = null!
		this.table_selection = null!
		this.selecting = false
		this.listeners = new Set()

		this.observe()
	}

	getTable() {
		return this.table
	}

	observe() {
		const observer = new MutationObserver(records => {
			this.editor.update(() => {
				let grid_needs_redraw = false

				for (let i = 0; i < records.length; i++) {
					const record = records[i]
					const target = record.target
					const node_name = target.nodeName

					if (
						node_name === 'TABLE' ||
						node_name === 'TBODY' ||
						node_name === 'THEAD' ||
						node_name === 'TR'
					) {
						grid_needs_redraw = true

						break
					}
				}

				if (!grid_needs_redraw) return

				const table = this.editor.getElementByKey(this.table_node_key)!

				this.table = getTable(table)

				$updateTableCols(this.editor, $getNodeByKey(this.table_node_key) as TableNode)
			})
		})

		this.editor.update(() => {
			const table = this.editor.getElementByKey(this.table_node_key)!

			this.table = getTable(table)

			observer.observe(table, { childList: true, subtree: true })
		})
	}

	reset() {
		this.anchor_x = -1
		this.anchor_y = -1
		this.focus_x = -1
		this.focus_y = -1
		this.anchor_cell_node_key = null!
		this.focus_cell_node_key = null!
		this.anchor_cell = null!
		this.focus_cell = null!
		this.table_selection = null!
		this.selecting = false

		this.editor.update(() => {
			this.removeSelectedCellsBg()
		})
	}

	addSelectedCellsBg(cells: Array<TableCellNode>) {
		cells.forEach(cell => {
			const cell_el = this.editor.getElementByKey(cell.getKey())!

			cell_el.setAttribute('style', 'background-color:var(--color_bg_2); caret-color:transparent')
		})
	}

	removeSelectedCellsBg() {
		this.table.rows.forEach(cells => {
			cells.forEach(cell => {
				const cell_node = $getNearestNodeFromDOMNode(cell.el)!

				const cell_el = this.editor.getElementByKey(cell_node.getKey())!

				if (cell_el.hasAttribute('style')) cell_el.removeAttribute('style')
			})
		})
	}

	updateTableSelection(selection: TableSelection): void {
		if (!selection) return this.removeSelectedCellsBg()

		if (selection.table_key === this.table_node_key) {
			this.table_selection = selection
		} else {
			this.table_node_key = selection.table_key

			this.updateTableSelection(selection)
		}
	}

	setFocusCellForSelection(cell: Cell) {
		const editor = this.editor

		editor.update(() => {
			const cell_x = cell.x
			const cell_y = cell.y

			this.focus_cell = cell

			if (this.anchor_cell) {
				const dom_selection = getDomSelection(editor._window)

				if (dom_selection) {
					dom_selection.setBaseAndExtent(this.anchor_cell.el, 0, this.focus_cell.el, 0)
				}
			}

			if (cell_x === this.focus_x && cell_y === this.focus_y) return

			const focus_node = $getNearestNodeFromDOMNode(cell.el) as TableCellNode

			this.focus_x = cell_x
			this.focus_y = cell_y
			this.focus_cell_node_key = focus_node.getKey()
			this.table_selection = this.table_selection.clone() || $createTableSelection()

			this.table_selection.set(this.table_node_key, this.anchor_cell_node_key, this.focus_cell_node_key)

			const cells = this.table_selection
				.getNodes()
				.filter(node => $isTableCellNode(node)) as Array<TableCellNode>

			this.removeSelectedCellsBg()
			this.addSelectedCellsBg(cells)

			$setSelection(this.table_selection)

			editor.dispatchCommand(SELECTION_CHANGE_COMMAND, null!)
		})
	}

	setAnchorCellForSelection(cell: Cell) {
		this.anchor_cell = cell
		this.anchor_x = cell.x
		this.anchor_y = cell.y

		this.editor.update(() => {
			const anchor_table_cell_node = $getNearestNodeFromDOMNode(cell.el)!

			if ($isTableCellNode(anchor_table_cell_node)) {
				const anchor_node_key = anchor_table_cell_node.getKey()

				this.table_selection = this.table_selection
					? this.table_selection.clone()
					: $createTableSelection()

				this.anchor_cell_node_key = anchor_node_key
			}
		})
	}

	formatCells(type: TextFormatType) {
		this.editor.update(() => {
			const selection = $getSelection()!
			const format_selection = $createRangeSelection()
			const anchor = format_selection.anchor
			const focus = format_selection.focus

			selection.getNodes().forEach(cell_node => {
				if ($isTableCellNode(cell_node) && cell_node.getTextContentSize() !== 0) {
					anchor.set(cell_node.getKey(), 0, 'element')
					focus.set(cell_node.getKey(), (cell_node as ElementNode).getChildrenSize(), 'element')

					format_selection.formatText(type)
				}
			})

			$setSelection(selection)

			this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined)
		})
	}

	clearText() {
		const editor = this.editor

		editor.update(() => {
			const table_node = $getNodeByKey(this.table_node_key)!
			const selection = $getSelection()!
			const selected_nodes = selection.getNodes().filter($isTableCellNode)

			if (selected_nodes.length === this.table.col_counts * this.table.row_counts) {
				table_node.selectPrevious()
				table_node.remove()

				const root_node = $getRoot()

				root_node.selectStart()

				return
			}

			selected_nodes.forEach(cell_node => {
				if ($isElementNode(cell_node)) {
					const paragraph_node = $createParagraphNode()
					const text_node = $createTextNode()

					paragraph_node.append(text_node)
					cell_node.append(paragraph_node)

					cell_node.getChildren().forEach(child => {
						if (child !== paragraph_node) {
							child.remove()
						}
					})
				}
			})

			$setSelection(null)

			editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined)
		})
	}

	removeListeners() {
		Array.from(this.listeners).forEach(item => item())
	}
}
