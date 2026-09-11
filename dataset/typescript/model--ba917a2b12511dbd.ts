import {
	$createNodeSelection,
	$getNearestNodeFromDOMNode,
	$getNodeByKey,
	$getSelection,
	$setSelection,
	COMMAND_PRIORITY_HIGH
} from 'lexical'
import { throttle } from 'lodash-es'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS } from '@/Editor/commands'
import { $getMatchingParent } from '@/Editor/utils'
import Utils from '@/models/utils'
import { deepEqual } from '@openages/stk/react'

import { $getTableColumnIndexFromTableCellNode, $isTableNode, $isTableSelection, getDOMCellFromTarget } from '../utils'

import type { LexicalEditor } from 'lexical'
import type TableNode from '../TableNode'
import type TableCellNode from '../TableCellNode'

@injectable()
export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	ref = null as unknown as HTMLDivElement
	tables = [] as Array<{ type: string; key: string }>
	info = {} as { table_node: TableNode; col_index: number; start: number }

	style = { left: 0, top: 0, height: 0 }
	visible = false
	hoving = false
	dragging = false

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{
				utils: false,
				id: false,
				editor: false,
				ref: false,
				tables: false,
				info: false,
				check: false,
				updateWidth: false
			},
			{ autoBind: true }
		)

		this.check = throttle(this.check.bind(this), 450)
		this.updateWidth = throttle(this.updateWidth.bind(this), 30)
	}

	init(id: Index['id'], editor: Index['editor']) {
		this.id = id
		this.editor = editor

		this.on()
	}

	reset() {
		if (!this.tables.length) return

		this.tables = []
		this.info = {} as Index['info']
		this.style = { left: 0, top: 0, height: 0 }
		this.visible = false
		this.hoving = false
		this.dragging = false
	}

	check(e: MouseEvent) {
		const { target } = e

		const is_table_selection = this.editor.getEditorState().read(() => $isTableSelection($getSelection()))

		if (is_table_selection) return this.reset()
		if (this.hoving || this.dragging) return

		this.editor.update(() => {
			const dom = getDOMCellFromTarget(target as HTMLElement)

			if (!dom) return this.reset()

			const cell_node = $getNearestNodeFromDOMNode(dom.el) as TableCellNode

			if (!cell_node) return this.reset()

			const table_node = $getMatchingParent(cell_node, $isTableNode) as TableNode
			const cell_el = this.editor.getElementByKey(cell_node.getKey())!
			const table_el = this.editor.getElementByKey(table_node.getKey())!
			const rect_cell = cell_el.getBoundingClientRect()
			const rect_table = table_el.getBoundingClientRect()
			const col_index = $getTableColumnIndexFromTableCellNode(cell_node)

			const style = {
				left: rect_cell.right - 4,
				top: rect_table.y,
				height: rect_table.height
			}

			if (deepEqual(style, $copy(this.style)) && this.visible) return

			this.info = { table_node, col_index, start: rect_cell.left }
			this.style = style
			this.visible = true
		})
	}

	mousemove(e: MouseEvent) {
		const { clientX } = e

		if (!this.dragging || !this.info.table_node) return

		if (clientX - this.info.start <= 60) return this.reset()

		this.style.left = clientX - 4.5

		this.updateWidth(clientX)
	}

	updateWidth(clientX: number) {
		this.editor.update(() => {
			if (!this.info.table_node) return

			this.info.table_node.updateCol(this.info.col_index, { width: clientX - this.info.start })
		})
	}

	clearCellSelection() {
		if (!this.info.table_node) return

		const selection = $createNodeSelection()

		selection.add(this.info.table_node.getKey())

		$setSelection(selection)
	}

	addRefListners(el: HTMLDivElement) {
		el.addEventListener('mousemove', this.mousemove)
		el.addEventListener('mouseenter', () => (this.hoving = true))

		el.addEventListener('mouseleave', () => {
			this.hoving = false
			this.visible = false
		})

		el.addEventListener('mousedown', () => {
			this.dragging = true

			this.editor.update(() => {
				this.clearCellSelection()
			})
		})

		el.addEventListener('mouseup', () => (this.dragging = false))
		el.addEventListener('mouseout', () => (this.dragging = false))
		el.addEventListener('mouseleave', () => (this.dragging = false))
	}

	checkSelection(path: Array<{ type: string; key: string }>) {
		const tables = path.filter(item => item.type === 'table')

		if (tables.length) {
			this.removeListners()

			if (!this.visible) this.dragging = false

			this.tables = tables

			this.addListners()
		} else {
			this.reset()
		}

		return false
	}

	addListners() {
		this.editor.update(() => {
			this.tables.forEach(item => {
				const node = $getNodeByKey(item.key) as TableNode
				const el = this.editor.getElementByKey(item.key)!

				if (node.existColspan()) {
					el.removeEventListener('mousemove', this.check)

					this.reset()
				} else {
					el.addEventListener('mousemove', this.check)
				}
			})
		})
	}

	removeListners() {
		this.editor.update(() => {
			this.tables.forEach(item => {
				const el = this.editor.getElementByKey(item.key)!

				el.removeEventListener('mousemove', this.check)
			})
		})
	}

	on() {
		this.utils.acts.push(
			this.editor.registerCommand(CHANGE_SELECTION_ELEMENTS, this.checkSelection, COMMAND_PRIORITY_HIGH)
		)
	}

	off() {
		this.utils.off()

		this.removeListners()
	}
}
