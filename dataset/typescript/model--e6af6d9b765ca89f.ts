import {
	$copyNode,
	$createParagraphNode,
	$getNodeByKey,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_HIGH
} from 'lexical'
import { groupBy } from 'lodash-es'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS } from '@/Editor/commands'
import { $cloneNode, $getMatchingParent } from '@/Editor/utils'
import Utils from '@/models/utils'
import { useInstanceWatch, Watch } from '@openages/stk/mobx'

import TableSelection from '../TableSelection'
import {
	$cellContainsEmptyParagraph,
	$getTableCellNodeRect,
	$isTableCellNode,
	$isTableNode,
	$isTableSelection
} from '../utils'

import type { LexicalEditor, RangeSelection } from 'lexical'
import type TableCellNode from '../TableCellNode'
import type TableNode from '../TableNode'
import type TableRowNode from '../TableRowNode'

@injectable()
export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	selection = null as unknown as RangeSelection

	type = '' as 'merge' | 'unmerge'
	style = { left: 0, top: 0 }
	visible = false

	watch = {
		visible: v => {
			const container = document.getElementById(this.id)!
			const handler = this.type === 'merge' ? this.getMergePosition : this.getUnmergePosition

			if (v) {
				container.addEventListener('scroll', handler)
			} else {
				container.removeEventListener('scroll', handler)
			}
		}
	} as Watch<Index>

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{
				utils: false,
				id: false,
				editor: false,
				selection: false,
				watch: false
			},
			{ autoBind: true }
		)
	}

	init(id: Index['id'], editor: Index['editor']) {
		this.utils.acts = useInstanceWatch(this)

		this.id = id
		this.editor = editor

		this.on()
	}

	reset() {
		if (!this.visible) return

		this.type = '' as Index['type']
		this.style = { left: 0, top: 0 }
		this.visible = false

		return false
	}

	getLargeCell() {
		const focus_node = this.selection.focus.getNode()
		const parents = focus_node.getParents()
		const cell_node = parents.find(item => item.getType() === 'table_cell')

		return cell_node as TableCellNode
	}

	getMergePosition() {
		this.editor.update(() => {
			const selection = $getSelection() as TableSelection
			const anchor_node = selection.anchor.getNode() as TableCellNode
			const focus_node = selection.focus.getNode() as TableCellNode
			const anchor_el = this.editor.getElementByKey(anchor_node.getKey())!
			const focus_el = this.editor.getElementByKey(focus_node.getKey())!

			const rect_anchor = anchor_el.getBoundingClientRect()
			const rect_focus = focus_el.getBoundingClientRect()

			const x_values = [rect_anchor.left, rect_anchor.right, rect_focus.left, rect_focus.right]
			const y_values = [rect_anchor.top, rect_anchor.bottom, rect_focus.top, rect_focus.bottom]
			const x_min = Math.min(...x_values)
			const y_min = Math.min(...y_values)
			const width = Math.max(...x_values) - x_min
			const height = Math.max(...y_values) - y_min

			this.type = 'merge'
			this.style = { left: x_min + width / 2 - 10.5, top: y_min + height / 2 - 10.5 }
			this.visible = true
		})

		return false
	}

	getUnmergePosition() {
		this.editor.update(() => {
			const cell_node = this.getLargeCell()
			const cell_el = this.editor.getElementByKey(cell_node.getKey())!
			const { right, top } = cell_el.getBoundingClientRect()

			this.type = 'unmerge'
			this.style = { left: right - 18, top: top + 3 }
			this.visible = true
		})
	}

	mergeCells() {
		const selection = $getSelection() as TableSelection
		const { anchor, focus } = selection
		const { merge_node_type } = selection.getShape()
		const target_node = (merge_node_type === 'anchor' ? anchor : focus).getNode() as TableCellNode
		const rowspan_values = [] as Array<number>
		const colspan_values = [] as Array<number>

		const cells = selection.getNodes().filter(item => $isTableCellNode(item)) as Array<TableCellNode>
		const els = cells.map(item => this.editor.getElementByKey(item.getKey()))

		if (!(els.every(item => item!.tagName === 'TD') || els.every(item => item!.tagName === 'TH'))) {
			return this.reset()
		}

		const group_cols = groupBy(cells, item => $getTableCellNodeRect(item)!.column_index)
		const group_rows = groupBy(cells, item => item.getParent()!.getKey())

		Object.keys(group_cols).forEach(col_index => {
			const cells = group_cols[col_index]

			const rowspan = cells.reduce((total, item) => {
				total += item.getRowSpan()

				return total
			}, 0)

			rowspan_values.push(rowspan)
		})

		Object.keys(group_rows).forEach(row_key => {
			const cells = group_rows[row_key]

			const colspan = cells.reduce((total, item) => {
				total += item.getColSpan()

				return total
			}, 0)

			colspan_values.push(colspan)
		})

		const rows = Math.max(...rowspan_values)
		const cols = Math.max(...colspan_values)

		cells.forEach(item => {
			if (!item.is(target_node)) {
				if (!$cellContainsEmptyParagraph(item)) {
					target_node.append(...item.getChildren().map(i => $cloneNode(i)))
				}

				item.remove()
			}
		})

		target_node.setRowSpan(rows).setColSpan(cols)
		target_node.getLastDescendant()!.selectEnd()
	}

	unmergeCells() {
		const cell_node = this.getLargeCell()
		const table_node = $getMatchingParent(cell_node, $isTableNode) as TableNode
		const { row_index, column_index, row_span, col_span } = $getTableCellNodeRect(cell_node)!
		const rows_arr = Array.from({ length: row_span })
		const cols_arr = Array.from({ length: col_span })
		const rows = table_node.getChildren() as Array<TableRowNode>
		const clone_cell_node = $cloneNode(cell_node) as TableCellNode

		clone_cell_node.setRowSpan(1).setColSpan(1)

		rows_arr.forEach((_, r_index) => {
			const row_node = rows[row_index + r_index]

			row_node.splice(
				column_index,
				0,
				cols_arr.map((_, c_index) => {
					if (r_index === 0 && c_index === 0) {
						return clone_cell_node
					} else {
						const raw_node = $copyNode(cell_node)

						raw_node.setRowSpan(1).setColSpan(1)

						return raw_node.append($createParagraphNode())
					}
				})
			)
		})

		rows[row_index].getChildren()[column_index].selectEnd()

		cell_node.remove()

		this.reset()
	}

	checkSelection(path: Array<{ type: string; key: string }>) {
		const selection = $getSelection()

		if ($isTableSelection(selection)) {
			return this.getMergePosition()
		}

		if ($isRangeSelection(selection)) {
			const cell = path.find(item => item.type === 'table_cell')

			if (!cell) return this.reset()

			const cell_node = $getNodeByKey(cell.key) as TableCellNode

			if (cell_node.getRowSpan() === 1 && cell_node.getColSpan() === 1) return this.reset()

			this.selection = selection

			this.getUnmergePosition()
		}

		return this.reset()
	}

	on() {
		this.utils.acts.push(
			this.editor.registerCommand(CHANGE_SELECTION_ELEMENTS, this.checkSelection, COMMAND_PRIORITY_HIGH)
		)
	}

	off() {
		this.utils.off()
	}
}
