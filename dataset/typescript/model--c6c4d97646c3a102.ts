import {
	$createParagraphNode,
	$getNearestNodeFromDOMNode,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	SELECTION_CHANGE_COMMAND
} from 'lexical'
import { makeAutoObservable, runInAction } from 'mobx'
import ntry from 'nice-try'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS } from '@/Editor/commands'
import { note_style } from '@/Editor/theme'
import { $cloneNode, $getMatchingParent } from '@/Editor/utils'
import Utils from '@/models/utils'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { mergeRegister } from '@lexical/utils'
import { useInstanceWatch, Watch } from '@openages/stk/mobx'

import {
	$computeTableMap,
	$createTableCellNode,
	$createTableRowNode,
	$getTableColumnIndexFromTableCellNode,
	$isTableCellNode,
	$isTableNode,
	$isTableRowNode
} from '../utils'

import type { LexicalEditor } from 'lexical'
import type TableNode from '../TableNode'
import type TableRowNode from '../TableRowNode'
import type TableCellNode from '../TableCellNode'
import type {
	CleanupFn,
	BaseEventPayload,
	ElementDragType
} from '@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types'
import type { TableMapValue } from '../types'

@injectable()
export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	nodes = [] as [TableNode, TableRowNode, TableCellNode] | []
	resize_observer = null as unknown as ResizeObserver
	ref_btn_row = null as unknown as HTMLDivElement
	ref_btn_row_right = null as unknown as HTMLDivElement
	ref_btn_col = null as unknown as HTMLDivElement
	ref_overlay = null as unknown as HTMLDivElement
	drag_acts = [] as Array<CleanupFn>

	position_row = { left: 0, top: 0 }
	position_row_right = { left: 0, top: 0 }
	position_col = { left: 0, top: 0 }
	visible = false
	visible_menu_type = '' as 'row' | 'row_right' | 'col'
	dragging_type = '' as 'row' | 'col'
	position_dragline = { left: 0, top: 0, width: 0, height: 0 }

	unregister = null as unknown as () => void

	watch = {
		visible: v => {
			const container = document.getElementById(this.id)!

			if (v) {
				if (this.nodes[0]) {
					const [table_node] = this.nodes
					const table_node_el = this.editor.getElementByKey(table_node.getKey())!

					table_node_el.addEventListener('scroll', this.onScroll)
				}

				container.addEventListener('scroll', this.onScroll)

				this.resize_observer = new ResizeObserver(this.onScroll)

				this.resize_observer.observe(container)
			} else {
				if (this.nodes[0]) {
					const [table_node] = this.nodes
					const table_node_el = this.editor.getElementByKey(table_node.getKey())!

					table_node_el.removeEventListener('scroll', this.onScroll)
				}

				document.getElementById(this.id)!.removeEventListener('scroll', this.onScroll)

				if (!this.resize_observer) return

				this.resize_observer.unobserve(container)
				this.resize_observer.disconnect()

				this.resize_observer = null as unknown as ResizeObserver
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
				nodes: false,
				resize_observer: false,
				ref_btn_row: false,
				ref_btn_row_right: false,
				ref_btn_col: false,
				ref_overlay: false,
				drag_acts: false,
				unregister: false,
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
		runInAction(() => {
			this.drag_acts.map(fn => fn())
			this.drag_acts = []
		})

		this.nodes = []
		this.position_row = { left: 0, top: 0 }
		this.position_row_right = { left: 0, top: 0 }
		this.position_col = { left: 0, top: 0 }
		this.visible = false
	}

	resetDragline() {
		this.dragging_type = '' as Index['dragging_type']
		this.position_dragline = { left: 0, top: 0, width: 0, height: 0 }

		if (this.ref_overlay) {
			this.ref_overlay.remove()

			this.ref_overlay = null as unknown as HTMLDivElement
		}
	}

	setRefBtnRow(el: HTMLDivElement, right?: boolean) {
		if (right) {
			this.ref_btn_row_right = el
		} else {
			this.ref_btn_row = el
		}

		const [table_node] = this.nodes

		if (!table_node) return

		const exist_large_cell = this.editor.getEditorState().read(() => table_node.existRowspan())

		if (exist_large_cell) return

		if (!el) return

		this.drag_acts.push(
			draggable({
				element: el,
				onGenerateDragPreview: args => {
					const { nativeSetDragImage } = args

					nativeSetDragImage!(el, 5, 5)
				},
				onDrag: args => {
					this.editor.update(() => {
						this.updateOverlay(args)

						const over = this.getDragOver(args)

						if (!over) return

						this.updateDragline(over)
					})
				},
				onDragStart: () => {
					this.visible_menu_type = '' as Index['visible_menu_type']
					this.dragging_type = 'row'
				},
				onDrop: args => {
					this.editor.update(() => {
						const active = this.getDragActive()
						const over = this.getDragOver(args)

						if (!over) return this.resetDragline()
						if (active.start_row === over.start_row) return this.resetDragline()

						const [table_node] = this.nodes
						const rows = table_node!.getChildren() as Array<TableRowNode>
						const active_row = rows[active.start_row]
						const over_row = rows[over.start_row]

						if (active.start_row < over.start_row) {
							over_row.insertAfter(active_row)
						} else {
							over_row.insertBefore(active_row)
						}

						this.resetDragline()
					})
				}
			})
		)
	}

	setRefBtnCol(el: HTMLDivElement) {
		this.ref_btn_col = el

		const [table_node] = this.nodes

		if (!table_node) return

		const exist_large_cell = this.editor.getEditorState().read(() => table_node.existColspan())

		if (exist_large_cell) return

		if (!el) return

		this.drag_acts.push(
			draggable({
				element: el,
				onGenerateDragPreview: args => {
					const { nativeSetDragImage } = args

					nativeSetDragImage!(this.ref_btn_col, 5, 3)
				},
				onDrag: args => {
					this.editor.update(() => {
						this.updateOverlay(args)

						const over = this.getDragOver(args)

						if (!over) return

						this.updateDragline(over)
					})
				},
				onDragStart: () => {
					this.visible_menu_type = '' as Index['visible_menu_type']
					this.dragging_type = 'col'
				},
				onDrop: args => {
					this.editor.update(() => {
						const active = this.getDragActive()
						const over = this.getDragOver(args)

						if (!over) return this.resetDragline()
						if (active.start_column === over.start_column) return this.resetDragline()

						const [table_node] = this.nodes
						const rows = table_node!.getChildren() as Array<TableRowNode>

						rows.forEach(row => {
							const cells = row.getChildren() as Array<TableCellNode>
							const active_cell = cells[active.start_column]
							const over_cell = cells[over.start_column]

							if (active.start_column < over.start_column) {
								over_cell.insertAfter(active_cell)
							} else {
								over_cell.insertBefore(active_cell)
							}
						})

						this.resetDragline()
					})
				}
			})
		)
	}

	getDragActive() {
		const [table_node, , table_cell_node] = this.nodes
		const [_, table_cell_map] = $computeTableMap(table_node!, table_cell_node!, null!)

		return table_cell_map
	}

	getDragOver(args: BaseEventPayload<ElementDragType>) {
		const { location } = args
		const { current } = location
		const { dropTargets } = current
		const target = dropTargets.at(0)

		if (!target) return

		const cell_node = $getNearestNodeFromDOMNode(target.element) as TableCellNode
		const table_node = $getMatchingParent(cell_node, $isTableNode) as TableNode
		const [_, table_cell_map] = $computeTableMap(table_node, cell_node, null!)

		return table_cell_map
	}

	updateOverlay(args: BaseEventPayload<ElementDragType>) {
		const { location } = args
		const { current } = location
		const { input } = current
		const { clientX, clientY } = input
		const [table_node, , table_cell_node] = this.nodes
		const { start_row, start_column } = this.getDragActive()
		const rows = table_node!.getChildren() as Array<TableRowNode>
		const cell_el = this.editor.getElementByKey(table_cell_node!.getKey())!
		const rect_el = cell_el.getBoundingClientRect()

		const getPosition = () => {
			if (this.dragging_type === 'row') {
				return {
					left: clientX + 9 + 'px',
					top: clientY - rect_el.height / 2 + 5 - 0.5 + 'px'
				}
			} else {
				return {
					left: clientX - rect_el.width / 2 + 5 - 0.5 + 'px',
					top: clientY + 9 + 'px'
				}
			}
		}

		const position = getPosition()

		const container = document.getElementById(this.id)!
		const overlay = document.createElement('div')
		const table = document.createElement('table')

		overlay.classList.value = `fixed`
		overlay.style.zIndex = '101'

		note_style.forEach(item => overlay.classList.add(item))

		table.classList.value = '__editor_table'
		table.style.left = position.left
		table.style.top = position.top
		table.style.backgroundColor = 'var(--color_bg)'
		table.style.margin = 'unset'

		if (this.ref_overlay) {
			this.ref_overlay.style.left = position.left
			this.ref_overlay.style.top = position.top

			return
		}

		if (this.dragging_type === 'row') {
			const row_node = rows[start_row]
			const row_el = this.editor.getElementByKey(row_node.getKey())!
			const rect_row = row_el.getBoundingClientRect()

			table.style.width = rect_row.width + 1 + 'px'
			table.style.height = rect_el.height + 1 + 'px'

			table.append(row_el.cloneNode(true) as unknown as string)
		} else {
			table.style.width = rect_el.width + 1 + 'px'

			rows.forEach(row => {
				const cells = row.getChildren() as Array<TableCellNode>

				cells.forEach((cell, index) => {
					if (index !== start_column) return

					const tr = document.createElement('tr')
					const el = this.editor.getElementByKey(cell.getKey())!

					tr.append(el.cloneNode(true) as unknown as string)
					table.append(tr as unknown as string)
				})
			})
		}

		overlay.append(table as unknown as string)
		container.append(overlay as unknown as string)

		this.ref_overlay = overlay
	}

	updateDragline(table_cell_map: TableMapValue) {
		const { cell } = table_cell_map
		const [table_node, table_row_node] = this.nodes

		const cell_el = this.editor.getElementByKey(cell.getKey())!
		const table_el = this.editor.getElementByKey(table_node!.getKey())!
		const table_row_el = this.editor.getElementByKey(table_row_node!.getKey())!
		const rect_cell = cell_el.getBoundingClientRect()
		const rect_table = table_el.getBoundingClientRect()
		const rect_table_row = table_row_el.getBoundingClientRect()

		if (this.dragging_type === 'row') {
			this.position_dragline = {
				left: rect_table.x,
				top: rect_cell.bottom - 0.5,
				width: rect_table_row.width,
				height: 0
			}
		} else {
			this.position_dragline = {
				left: rect_cell.right - 0.5,
				top: rect_table.y,
				width: 0,
				height: rect_table.height
			}
		}
	}

	onClick(args: { key: string; keyPath: Array<string> }) {
		const { key, keyPath } = args
		const [table_node, table_row_node, table_cell_node] = this.nodes
		const [table_map, cell_map] = $computeTableMap(table_node!, table_cell_node!, null!)
		const { start_row, start_column } = cell_map

		if (keyPath.length === 2) {
			if (key === 'left') {
				table_node!.resetColAttr(start_column, 'align')
			} else {
				table_node!.updateCol(start_column, { align: key })
			}
		} else {
			if (key === 'header_row') {
				const cells = table_row_node!.getChildren() as Array<TableCellNode>
				const total_is_header = cells.some(item => item.__is_header)

				cells.forEach(item => {
					const target = item.getWritable()

					target.__is_header = !total_is_header
				})

				return
			}

			if (key === 'insert_above' || key === 'insert_below') {
				const row = $createTableRowNode()

				const target = table_map[start_row].map(({ cell }) =>
					$createTableCellNode({
						is_header: cell.__is_header,
						col_span: cell.getColSpan()
					}).append($createParagraphNode())
				)

				if (key === 'insert_above') {
					table_node!.splice(start_row, 0, [row.append(...target)])
				} else {
					table_node!.splice(start_row + 1, 0, [row.append(...target)])
				}

				return
			}

			if (key === 'clone_row') {
				const row = $createTableRowNode()

				const target = table_map[start_row].map(({ cell }) => {
					const new_cell = $createTableCellNode({ is_header: cell.__is_header })

					new_cell.append(...cell.getChildren().map(i => $cloneNode(i)))

					return cell
				})

				table_node!.splice(start_row + 1, 0, [row.append(...target)])

				return
			}

			if (key === 'clear_row') {
				const cells = table_row_node!.getChildren() as Array<TableCellNode>

				cells.forEach(item => {
					item.clear()
					item.append($createParagraphNode())
				})

				return
			}

			if (key === 'remove_row') {
				if (table_map.length === 1 && table_row_node!.isLastChild()) return

				table_row_node!.remove()

				return
			}

			if (key === 'reset_width') {
				table_node!.resetColAttr(start_column, 'width')

				return
			}

			if (
				key === 'header_col' ||
				key === 'insert_left' ||
				key === 'insert_right' ||
				key === 'clone_col' ||
				key === 'clear_col' ||
				key === 'remove_col'
			) {
				const rows = table_node!.getChildren() as Array<TableRowNode>

				let total_is_header = false

				if (key === 'header_col') {
					total_is_header = rows.some(
						row => (row.getChildren()[start_column] as TableCellNode).__is_header
					)
				}

				rows.forEach(row => {
					const cells = row.getChildren() as Array<TableCellNode>

					cells.forEach((cell, index) => {
						if (start_column !== index) return

						if (key === 'header_col') {
							const target = cell.getWritable()

							target.__is_header = !total_is_header
						}

						if (key === 'insert_left' || key === 'insert_right') {
							const target = $createTableCellNode({ is_header: cell.__is_header }).append(
								$createParagraphNode()
							)

							if (key === 'insert_left') {
								cell.insertBefore(target)
							} else {
								cell.insertAfter(target)
							}
						}

						if (key == 'clone_col') {
							const new_cell = $createTableCellNode({ is_header: cell.__is_header })

							new_cell.append(...cell.getChildren().map(i => $cloneNode(i)))

							cell.insertAfter(new_cell)
						}

						if (key == 'clear_col') {
							cell.clear()
							cell.append($createParagraphNode())
						}

						if (cells.length > 1 && key === 'remove_col') {
							cell.remove()
						}
					})
				})
			}
		}
	}

	getPosition() {
		this.editor.getEditorState().read(() => {
			const [table_node, table_row_node, table_cell_node] = this.nodes
			const col_index = ntry(() => $getTableColumnIndexFromTableCellNode(table_cell_node!))

			if (col_index === undefined) return

			const first_row_node = table_node!.getChildren().at(0) as TableRowNode
			const target_col_node = first_row_node.getChildren().at(col_index)

			if (!table_node || !table_row_node || !table_cell_node || !target_col_node) return

			const root = this.editor.getRootElement()
			const table_node_el = this.editor.getElementByKey(table_node.getKey())
			const table_row_node_el = this.editor.getElementByKey(table_row_node.getKey())
			const table_cell_node_el = this.editor.getElementByKey(table_cell_node.getKey())
			const target_col_node_el = this.editor.getElementByKey(target_col_node.getKey())

			if (!root || !table_node_el || !table_row_node_el || !table_cell_node_el || !target_col_node_el)
				return

			const rect_root = root.getBoundingClientRect()
			const rect_row = table_row_node_el.getBoundingClientRect()
			const rect_cell = table_cell_node_el.getBoundingClientRect()
			const rect_col = target_col_node_el.getBoundingClientRect()

			const exsit_large_rowspan = table_node.existLargeRowspan()
			const exsit_large_colspan = table_node.existLargeColspan()

			if (exsit_large_rowspan && exsit_large_colspan) {
				return this.reset()
			}

			const row_top = rect_row.y + rect_row.height / 2 - 5

			this.position_row = !exsit_large_rowspan
				? {
						left: rect_row.x - 0.5 + table_node_el.scrollLeft,
						top: row_top
					}
				: { left: 0, top: 0 }

			const row_right_left =
				rect_row.width > rect_root.width
					? rect_root.x + rect_root.width - 1.5
					: rect_root.x + rect_row.width - 0.5

			this.position_row_right = !exsit_large_rowspan
				? {
						left: row_right_left,
						top: row_top
					}
				: { left: 0, top: 0 }

			this.position_col = !exsit_large_colspan
				? { left: rect_cell.x + rect_cell.width / 2 - 5, top: rect_col.y - 0.5 }
				: { left: 0, top: 0 }
		})
	}

	onSelection() {
		const selection = $getSelection()

		if (!$isRangeSelection(selection) || selection.anchor.offset !== selection.focus.offset) {
			this.reset()

			return
		}

		const anchor = selection.anchor.getNode()
		const table_node = $getMatchingParent(anchor, $isTableNode) as TableNode
		const table_row_node = $getMatchingParent(anchor, $isTableRowNode) as TableRowNode
		const table_cell_node = $getMatchingParent(anchor, $isTableCellNode) as TableCellNode

		if (!table_node || !table_row_node || !table_cell_node) {
			this.reset()

			return
		}

		const [prev_table_node, prev_table_row_node, prev_table_cell_node] = this.nodes

		if (
			prev_table_node &&
			prev_table_row_node &&
			prev_table_cell_node &&
			prev_table_node.getKey() === table_node.getKey() &&
			prev_table_row_node.getKey() === table_row_node.getKey() &&
			prev_table_cell_node.getKey() === table_cell_node.getKey()
		) {
			this.getPosition()

			return
		}

		this.nodes = [table_node, table_row_node, table_cell_node]

		this.getPosition()

		this.visible = true

		return false
	}

	onScroll() {
		if (!this.nodes.length) return

		this.getPosition()
	}

	checkSelection(path: Array<{ type: string; key: string }>) {
		if (path.find(item => item.type === 'table') !== undefined) {
			this.addListeners()
		} else {
			this.reset()
			this.removeListeners()
		}

		return false
	}

	addListeners() {
		if (this.unregister) this.unregister()

		this.unregister = mergeRegister(
			this.editor.registerCommand(SELECTION_CHANGE_COMMAND, this.onSelection, COMMAND_PRIORITY_LOW)
		)
	}

	removeListeners() {
		if (!this.unregister) return

		this.unregister()

		this.unregister = null as unknown as () => void
	}

	on() {
		this.utils.acts.push(
			this.editor.registerCommand(CHANGE_SELECTION_ELEMENTS, this.checkSelection, COMMAND_PRIORITY_HIGH)
		)
	}

	off() {
		this.utils.off()

		this.removeListeners()
	}
}
