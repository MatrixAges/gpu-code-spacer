import {
	$createParagraphNode,
	$createRangeSelectionFromDom,
	$createTextNode,
	$getNearestNodeFromDOMNode,
	$getPreviousSelection,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	COMMAND_PRIORITY_CRITICAL,
	COMMAND_PRIORITY_LOW,
	CONTROLLED_TEXT_INSERTION_COMMAND,
	DELETE_CHARACTER_COMMAND,
	DELETE_LINE_COMMAND,
	DELETE_WORD_COMMAND,
	FOCUS_COMMAND,
	FORMAT_ELEMENT_COMMAND,
	FORMAT_TEXT_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_LEFT_COMMAND,
	KEY_ARROW_RIGHT_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	KEY_ESCAPE_COMMAND,
	KEY_TAB_COMMAND,
	SELECTION_CHANGE_COMMAND,
	SELECTION_INSERT_CLIPBOARD_NODES_COMMAND
} from 'lexical'

import { $getMatchingParent, getDomSelection, stopEvent } from '@/Editor/utils'
import { $findMatchingParent } from '@lexical/utils'

import TableObserver from '../TableObserver'
import {
	$computeTableMap,
	$createTableSelection,
	$findCellNode,
	$findTableNode,
	$getTableEdgeCursorPosition,
	$handleArrowKey,
	$insertParagraphAtTableEdge,
	$isSelectionInTable,
	$isTableCellNode,
	$isTableNode,
	$isTableRowNode,
	$isTableSelection,
	createMouseHandlers,
	getDOMCellFromTarget,
	selectTableNodeInDirection,
	LEXICAL_ELEMENT_KEY
} from './index'

import type TableRowNode from '../TableRowNode'
import type TableNode from '../TableNode'
import type TableCellNode from '../TableCellNode'
import type TableSelection from '../TableSelection'
import type { HTMLTableElementWithWithTableSelectionState } from '../types'
import type { ElementFormatType, LexicalCommand, LexicalEditor, TextFormatType, NodeKey, LexicalNode } from 'lexical'

export default (
	table_node: TableNode,
	table_element: HTMLTableElementWithWithTableSelectionState,
	editor: LexicalEditor
) => {
	const observer = new TableObserver(editor, table_node.getKey())
	const commands = [DELETE_WORD_COMMAND, DELETE_LINE_COMMAND, DELETE_CHARACTER_COMMAND]

	table_element[LEXICAL_ELEMENT_KEY] = observer

	const getObserverCellFromCellNode = (table_cell_node: TableCellNode) => {
		const current_cords = table_node.getCordsFromCellNode(table_cell_node, observer.table)!

		return table_node.getDOMCellFromCords(current_cords.x, current_cords.y, observer.table)
	}

	const onDeleteText = (command: LexicalCommand<boolean>) => () => {
		const selection = $getSelection()!

		if (!$isSelectionInTable(selection, table_node)) return false

		if ($isTableSelection(selection)) {
			observer.clearText()

			return true
		} else if ($isRangeSelection(selection)) {
			const table_cell_node = $findMatchingParent(selection.anchor.getNode(), n => $isTableCellNode(n))!

			if (!$isTableCellNode(table_cell_node)) {
				return false
			}

			const anchor_node = selection.anchor.getNode()
			const focus_node = selection.focus.getNode()
			const is_anchor_inside = table_node.isParentOf(anchor_node)
			const is_focus_inside = table_node.isParentOf(focus_node)

			if (is_anchor_inside !== is_focus_inside) {
				observer.clearText()

				return true
			}

			const nearest_element_node = $findMatchingParent(selection.anchor.getNode(), n => $isElementNode(n))

			const top_level_cell_element_node =
				nearest_element_node &&
				$findMatchingParent(
					nearest_element_node,
					n => $isElementNode(n) && $isTableCellNode(n.getParent()!)
				)

			if (!$isElementNode(top_level_cell_element_node) || !$isElementNode(nearest_element_node)) {
				return false
			}

			if (command === DELETE_LINE_COMMAND && top_level_cell_element_node.getPreviousSibling() === null) {
				return true
			}
		}

		return false
	}

	const onDeleteCell = (event: KeyboardEvent): boolean => {
		const selection = $getSelection()!

		if (!$isSelectionInTable(selection, table_node) || !$isRangeSelection(selection)) {
			return false
		}

		const anchor = selection.anchor.getNode()
		const table_row_node = $getMatchingParent(anchor, $isTableRowNode) as TableRowNode
		const table_cell_node = $getMatchingParent(anchor, $isTableCellNode) as TableCellNode

		if (!table_row_node || !table_cell_node) return false

		const is_first_row = table_node.getChildren().at(0)!.getKey() === table_row_node.getKey()
		const is_first_column = table_row_node.getChildren().at(0)!.getKey() === table_cell_node.getKey()

		if (is_first_row && is_first_column && table_cell_node.getTextContentSize() === 0) {
			const prev = table_node.getPreviousSibling()
			const next = table_node.getNextSibling()

			if (!prev && !next) {
				const p = $createParagraphNode()

				editor.update(() => {
					table_node.insertAfter(p)

					table_node.remove()

					p.select()
				})
			} else {
				editor.update(() => {
					table_node.remove()
				})
			}

			return false
		}

		if ($isTableSelection(selection)) {
			event.preventDefault()
			event.stopPropagation()
			observer.clearText()

			return true
		} else if ($isRangeSelection(selection)) {
			const table_cell_node = $findMatchingParent(selection.anchor.getNode(), n => $isTableCellNode(n))!

			if (!$isTableCellNode(table_cell_node)) {
				return false
			}
		}

		return false
	}

	const onResetObserver = () => {
		const selection = editor.getEditorState().read(() => $getSelection() as TableSelection)

		if ($isTableSelection(selection) && selection.table_key === observer.table_node_key) {
			observer.reset()
		}
	}

	window.addEventListener('mousedown', onResetObserver)

	observer.listeners.add(() => {
		window.removeEventListener('mousedown', onResetObserver)
	})

	table_element.addEventListener('mousedown', (event: MouseEvent) => {
		setTimeout(() => {
			if (event.button !== 0) return

			const anchor_cell = getDOMCellFromTarget(event.target as HTMLElement)

			if (anchor_cell !== null) {
				stopEvent(event)

				observer.setAnchorCellForSelection(anchor_cell)
			}

			const { onMouseMove, onMouseUp } = createMouseHandlers(observer)

			observer.selecting = true

			window.addEventListener('mouseup', onMouseUp)
			window.addEventListener('mousemove', onMouseMove)
		}, 0)
	})

	commands.forEach(command => {
		observer.listeners.add(editor.registerCommand(command, onDeleteText(command), COMMAND_PRIORITY_LOW))
	})

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(
			KEY_ARROW_DOWN_COMMAND,
			event => $handleArrowKey(editor, event, 'down', table_node, observer),
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(
			KEY_ARROW_UP_COMMAND,
			event => $handleArrowKey(editor, event, 'up', table_node, observer),
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(
			KEY_ARROW_LEFT_COMMAND,
			event => $handleArrowKey(editor, event, 'backward', table_node, observer),
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(
			KEY_ARROW_RIGHT_COMMAND,
			event => $handleArrowKey(editor, event, 'forward', table_node, observer),
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(
			KEY_ESCAPE_COMMAND,
			event => {
				const selection = $getSelection() as TableSelection

				if ($isTableSelection(selection)) {
					const focus_cell_node = $findMatchingParent(selection.focus.getNode(), $isTableCellNode)!

					if ($isTableCellNode(focus_cell_node)) {
						stopEvent(event)

						focus_cell_node.selectEnd()

						return true
					}
				}

				return false
			},
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(KEY_BACKSPACE_COMMAND, onDeleteCell, COMMAND_PRIORITY_LOW)
	)

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(KEY_DELETE_COMMAND, onDeleteCell, COMMAND_PRIORITY_LOW)
	)

	observer.listeners.add(
		editor.registerCommand<TextFormatType>(
			FORMAT_TEXT_COMMAND,
			payload => {
				const selection = $getSelection()!

				if (!$isSelectionInTable(selection, table_node)) {
					return false
				}

				if ($isTableSelection(selection)) {
					observer.formatCells(payload)

					return true
				} else if ($isRangeSelection(selection)) {
					const table_cell_node = $findMatchingParent(selection.anchor.getNode(), n =>
						$isTableCellNode(n)
					)!

					if (!$isTableCellNode(table_cell_node)) {
						return false
					}
				}

				return false
			},
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand<ElementFormatType>(
			FORMAT_ELEMENT_COMMAND,
			format_type => {
				const selection = $getSelection() as TableSelection

				if (!$isTableSelection(selection) || !$isSelectionInTable(selection, table_node)) {
					return false
				}

				const anchor_node = selection.anchor.getNode() as TableCellNode
				const focus_node = selection.focus.getNode() as TableCellNode

				if (!$isTableCellNode(anchor_node) || !$isTableCellNode(focus_node)) {
					return false
				}

				const [table_map, anchor_cell, focus_cell] = $computeTableMap(
					table_node,
					anchor_node,
					focus_node
				)

				const max_row = Math.max(anchor_cell.start_row, focus_cell.start_row)
				const max_column = Math.max(anchor_cell.start_column, focus_cell.start_column)
				const min_row = Math.min(anchor_cell.start_row, focus_cell.start_row)
				const min_column = Math.min(anchor_cell.start_column, focus_cell.start_column)

				for (let i = min_row; i <= max_row; i++) {
					for (let j = min_column; j <= max_column; j++) {
						const cell = table_map[i][j].cell

						cell.setFormat(format_type)

						const cell_children = cell.getChildren()

						for (let k = 0; k < cell_children.length; k++) {
							const child = cell_children[k]
							if ($isElementNode(child) && !child.isInline()) {
								child.setFormat(format_type)
							}
						}
					}
				}

				return true
			},
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand(
			CONTROLLED_TEXT_INSERTION_COMMAND,
			payload => {
				const selection = $getSelection()!

				if (!$isSelectionInTable(selection, table_node)) {
					return false
				}

				if ($isTableSelection(selection)) {
					return false
				} else if ($isRangeSelection(selection)) {
					const table_cell_node = $findMatchingParent(selection.anchor.getNode(), n =>
						$isTableCellNode(n)
					)!

					if (!$isTableCellNode(table_cell_node)) {
						return false
					}

					if (typeof payload === 'string') {
						const edge_position = $getTableEdgeCursorPosition(editor, selection, table_node)

						if (edge_position) {
							$insertParagraphAtTableEdge(edge_position, table_node, [
								$createTextNode(payload)
							])

							return true
						}
					}
				}

				return false
			},
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand<KeyboardEvent>(
			KEY_TAB_COMMAND,
			event => {
				const selection = $getSelection()
				if (
					!$isRangeSelection(selection) ||
					!selection.isCollapsed() ||
					!$isSelectionInTable(selection, table_node)
				) {
					return false
				}

				const table_cell_node = $findCellNode(selection.anchor.getNode())

				if (table_cell_node === null) {
					return false
				}

				stopEvent(event)

				const current_cords = table_node.getCordsFromCellNode(table_cell_node, observer.table)!

				selectTableNodeInDirection(
					observer,
					table_node,
					current_cords.x,
					current_cords.y,
					!event.shiftKey ? 'forward' : 'backward'
				)

				return true
			},
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(editor.registerCommand(FOCUS_COMMAND, _ => table_node.isSelected(), COMMAND_PRIORITY_LOW))

	observer.listeners.add(
		editor.registerCommand(
			SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
			selection_payload => {
				const { nodes, selection } = selection_payload
				const anchor_and_focus = selection.getStartEndPoints()
				const is_table_selection = $isTableSelection(selection)
				const is_range_selection = $isRangeSelection(selection)
				const is_selection_inside_of_grid =
					(is_range_selection &&
						$findMatchingParent(selection.anchor.getNode(), n => $isTableCellNode(n)) !==
							null &&
						$findMatchingParent(selection.focus.getNode(), n => $isTableCellNode(n)) !==
							null) ||
					is_table_selection

				if (
					nodes.length !== 1 ||
					!$isTableNode(nodes[0]) ||
					!is_selection_inside_of_grid ||
					anchor_and_focus === null
				) {
					return false
				}

				const [anchor] = anchor_and_focus
				const new_grid = nodes[0] as TableNode
				const new_grid_rows = new_grid.getChildren() as Array<TableRowNode>
				const new_column_count = new_grid.getFirstChildOrThrow<TableNode>().getChildrenSize()
				const new_row_count = new_grid.getChildrenSize()
				const grid_cell_node = $findMatchingParent(anchor.getNode(), n => $isTableCellNode(n))!
				const grid_row_node =
					grid_cell_node &&
					($findMatchingParent(grid_cell_node, n => $isTableRowNode(n)) as TableRowNode)
				const grid_node =
					grid_row_node && ($findMatchingParent(grid_row_node, n => $isTableNode(n)) as TableNode)

				if (
					!$isTableCellNode(grid_cell_node) ||
					!$isTableRowNode(grid_row_node) ||
					!$isTableNode(grid_node)
				) {
					return false
				}

				const start_y = grid_row_node.getIndexWithinParent()
				const stop_y = Math.min(grid_node.getChildrenSize() - 1, start_y + new_row_count - 1)
				const start_x = grid_cell_node.getIndexWithinParent()
				const stop_x = Math.min(grid_row_node.getChildrenSize() - 1, start_x + new_column_count - 1)
				const from_x = Math.min(start_x, stop_x)
				const from_y = Math.min(start_y, stop_y)
				const to_x = Math.max(start_x, stop_x)
				const to_y = Math.max(start_y, stop_y)
				const grid_row_nodes = grid_node.getChildren() as Array<TableRowNode>
				let new_row_idx = 0
				let new_anchor_cell_key: NodeKey
				let new_focus_cell_key: NodeKey

				for (let r = from_y; r <= to_y; r++) {
					const current_grid_row_node = grid_row_nodes[r]

					if (!$isTableRowNode(current_grid_row_node)) {
						return false
					}

					const new_grid_row_node = new_grid_rows[new_row_idx]

					if (!$isTableRowNode(new_grid_row_node)) {
						return false
					}

					const grid_cell_nodes = current_grid_row_node.getChildren()
					const new_grid_cell_nodes = new_grid_row_node.getChildren()
					let new_column_idx = 0

					for (let c = from_x; c <= to_x; c++) {
						const current_grid_cell_node = grid_cell_nodes[c] as TableCellNode

						if (!$isTableCellNode(current_grid_cell_node)) {
							return false
						}

						const new_grid_cell_node = new_grid_cell_nodes[new_column_idx] as TableCellNode

						if (!$isTableCellNode(new_grid_cell_node)) {
							return false
						}

						if (r === from_y && c === from_x) {
							new_anchor_cell_key = current_grid_cell_node.getKey()
						} else if (r === to_y && c === to_x) {
							new_focus_cell_key = current_grid_cell_node.getKey()
						}

						const original_children = current_grid_cell_node.getChildren()

						new_grid_cell_node.getChildren().forEach(child => {
							if ($isTextNode(child)) {
								const paragraph_node = $createParagraphNode()
								paragraph_node.append(child)
								current_grid_cell_node.append(child)
							} else {
								current_grid_cell_node.append(child)
							}
						})

						original_children.forEach(n => n.remove())
						new_column_idx++
					}

					new_row_idx++
				}

				if (new_anchor_cell_key! && new_focus_cell_key!) {
					const new_table_selection = $createTableSelection()

					new_table_selection.set(nodes[0].getKey(), new_anchor_cell_key, new_focus_cell_key)

					$setSelection(new_table_selection)
				}

				return true
			},
			COMMAND_PRIORITY_LOW
		)
	)

	observer.listeners.add(
		editor.registerCommand(
			SELECTION_CHANGE_COMMAND,
			() => {
				const selection = $getSelection() as TableSelection
				const prev_selection = $getPreviousSelection() as TableSelection

				if ($isRangeSelection(selection)) {
					const { anchor, focus } = selection
					const anchor_node = anchor.getNode()
					const focus_node = focus.getNode()
					const anchor_cell_node = $findCellNode(anchor_node)
					const focus_cell_node = $findCellNode(focus_node)
					const is_anchor_inside = !!(
						anchor_cell_node && table_node.is($findTableNode(anchor_cell_node))
					)
					const is_focus_inside = !!(
						focus_cell_node && table_node.is($findTableNode(focus_cell_node))
					)
					const is_partialy_within_table = is_anchor_inside !== is_focus_inside
					const is_within_table = is_anchor_inside && is_focus_inside
					const is_backward = selection.isBackward()

					if (is_partialy_within_table) {
						const new_selection = selection.clone()

						if (is_focus_inside) {
							new_selection.focus.set(
								table_node.getParentOrThrow().getKey(),
								table_node.getIndexWithinParent(),
								'element'
							)
						} else {
							new_selection.anchor.set(
								table_node.getParentOrThrow().getKey(),
								is_backward
									? table_node.getIndexWithinParent() + 1
									: table_node.getIndexWithinParent(),
								'element'
							)
						}

						$setSelection(new_selection)
					} else if (is_within_table) {
						if (!anchor_cell_node.is(focus_cell_node)) {
							observer.setAnchorCellForSelection(
								getObserverCellFromCellNode(anchor_cell_node)!
							)

							observer.setFocusCellForSelection(
								getObserverCellFromCellNode(focus_cell_node)!
							)

							if (!observer.selecting) {
								setTimeout(() => {
									const { onMouseMove, onMouseUp } = createMouseHandlers(observer)

									observer.selecting = true

									window.addEventListener('mousemove', onMouseMove)
									window.addEventListener('mouseup', onMouseUp)
								}, 0)
							}
						}
					}
				} else if (
					selection &&
					$isTableSelection(selection) &&
					selection.is(prev_selection) &&
					selection.table_key === table_node.getKey()
				) {
					const dom_selection = getDomSelection(editor._window)

					if (dom_selection && dom_selection.anchorNode && dom_selection.focusNode) {
						const focus_node = $getNearestNodeFromDOMNode(dom_selection.focusNode)
						const is_focus_outside = focus_node && !table_node.is($findTableNode(focus_node))

						const anchor_node = $getNearestNodeFromDOMNode(dom_selection.anchorNode)
						const is_anchor_inside = anchor_node && table_node.is($findTableNode(anchor_node))

						dom_selection.removeAllRanges()

						if (is_focus_outside && is_anchor_inside && dom_selection.rangeCount > 0) {
							const new_selection = $createRangeSelectionFromDom(dom_selection, editor)

							if (new_selection) {
								new_selection.anchor.set(
									table_node.getKey(),
									selection.isBackward() ? table_node.getChildrenSize() : 0,
									'element'
								)

								$setSelection(new_selection)
							}
						}
					}
				}

				if (
					selection &&
					!selection.is(prev_selection) &&
					($isTableSelection(selection) || $isTableSelection(prev_selection)) &&
					observer.table_selection &&
					!observer.table_selection.is(prev_selection)
				) {
					if ($isTableSelection(selection) && selection.table_key === observer.table_node_key) {
						observer.updateTableSelection(selection)
					} else if (
						!$isTableSelection(selection) &&
						$isTableSelection(prev_selection) &&
						prev_selection.table_key === observer.table_node_key
					) {
						observer.updateTableSelection(null!)
					}

					return false
				}

				return false
			},
			COMMAND_PRIORITY_CRITICAL
		)
	)

	observer.listeners.add(
		editor.registerCommand(
			INSERT_PARAGRAPH_COMMAND,
			() => {
				const selection = $getSelection()

				if (
					!$isRangeSelection(selection) ||
					!selection.isCollapsed() ||
					!$isSelectionInTable(selection, table_node)
				) {
					return false
				}

				const anchor = selection.anchor.getNode()
				const table_row_node = $getMatchingParent(anchor, $isTableRowNode) as TableRowNode
				const table_cell_node = $getMatchingParent(anchor, $isTableCellNode) as TableCellNode

				if (!table_row_node || !table_cell_node) return false

				const is_last_row = table_node.getChildren().at(-1)!.getKey() === table_row_node.getKey()
				const is_last_column =
					table_row_node.getChildren().at(-1)!.getKey() === table_cell_node.getKey()
				const children = table_cell_node.getChildren()
				const children_length = children.length

				if (
					is_last_row &&
					is_last_column &&
					children.at(-1)?.getTextContentSize() === 0 &&
					children.at(-2)?.getTextContentSize() === 0
				) {
					const next_node = table_node.getNextSibling()

					let p: LexicalNode

					if (next_node) {
						p = next_node
					} else {
						p = $createParagraphNode()

						table_node.insertAfter(p)
					}

					editor.update(() => {
						children.at(-1)!.remove()

						if (children_length > 2) {
							children.at(-2)!.remove()
						}

						table_node.selectNext()
					})

					return true
				}

				const edge_position = $getTableEdgeCursorPosition(editor, selection, table_node)

				if (edge_position) {
					$insertParagraphAtTableEdge(edge_position, table_node)

					return true
				}

				return false
			},
			COMMAND_PRIORITY_LOW
		)
	)

	return observer
}
