import { $getSelection, $isElementNode, $isRangeSelection } from 'lexical'

import { isPickerInView, stopEvent } from '@/Editor/utils'
import { $findMatchingParent } from '@lexical/utils'

import {
	$findTableNode,
	$handleTableExit,
	$isSelectionInTable,
	$isTableCellNode,
	$isTableNode,
	$isTableSelection,
	adjustFocusNodeInDirection,
	getTable,
	isExitingTableAnchor,
	selectTableNodeInDirection
} from './index'

import type { LexicalEditor } from 'lexical'
import type { Direction } from '../types'
import type TableSelection from '../TableSelection'
import type TableNode from '../TableNode'
import type TableCellNode from '../TableCellNode'
import type TableObserver from '../TableObserver'

const Index = (
	editor: LexicalEditor,
	event: KeyboardEvent,
	direction: Direction,
	table_node: TableNode,
	table_observer: TableObserver
): boolean => {
	if ((direction === 'up' || direction === 'down') && isPickerInView(editor)) return false

	const selection = $getSelection() as TableSelection

	if (!$isSelectionInTable(selection, table_node)) {
		if (direction === 'backward' && $isRangeSelection(selection) && selection.isCollapsed()) {
			const anchor_type = selection.anchor.type
			const anchor_offset = selection.anchor.offset

			if (anchor_type !== 'element' && !(anchor_type === 'text' && anchor_offset === 0)) {
				return false
			}

			const anchor_node = selection.anchor.getNode()

			if (!anchor_node) return false

			const parent_node = $findMatchingParent(anchor_node, n => $isElementNode(n) && !n.isInline())

			if (!parent_node) return false

			const sibling_node = parent_node.getPreviousSibling()

			if (!sibling_node || !$isTableNode(sibling_node)) return false

			stopEvent(event)

			sibling_node.selectEnd()

			return true
		}

		return false
	}

	if ($isRangeSelection(selection) && selection.isCollapsed()) {
		const { anchor, focus } = selection
		const anchor_cell_node = $findMatchingParent(anchor.getNode(), $isTableCellNode) as TableCellNode
		const focus_cell_node = $findMatchingParent(focus.getNode(), $isTableCellNode) as TableCellNode

		if (!$isTableCellNode(anchor_cell_node) || !anchor_cell_node.is(focus_cell_node)) return false

		const anchor_cell_table = $findTableNode(anchor_cell_node) as TableNode

		if (anchor_cell_table !== table_node && anchor_cell_table != null) {
			const anchor_cell_table_element = editor.getElementByKey(anchor_cell_table.getKey())

			if (anchor_cell_table_element != null) {
				table_observer.table = getTable(anchor_cell_table_element)

				return Index(editor, event, direction, anchor_cell_table, table_observer)
			}
		}

		if (direction === 'backward' || direction === 'forward') {
			const anchor_type = anchor.type
			const anchor_offset = anchor.offset
			const anchor_node = anchor.getNode()

			if (!anchor_node) return false

			if (isExitingTableAnchor(anchor_type, anchor_offset, anchor_node, direction)) {
				return $handleTableExit(event, anchor_node, table_node, direction)
			}

			return false
		}

		const anchor_cell_dom = editor.getElementByKey(anchor_cell_node.__key)
		const anchor_dom = editor.getElementByKey(anchor.key)

		if (anchor_dom == null || anchor_cell_dom == null) return false

		let edge_selection_rect: DOMRect

		if (anchor.type === 'element') {
			edge_selection_rect = anchor_dom.getBoundingClientRect()
		} else {
			const dom_selection = window.getSelection()

			if (dom_selection === null || dom_selection.rangeCount === 0) return false

			const range = dom_selection.getRangeAt(0)

			edge_selection_rect = range.getBoundingClientRect()
		}

		const edge_child = direction === 'up' ? anchor_cell_node.getFirstChild() : anchor_cell_node.getLastChild()
		if (edge_child == null) {
			return false
		}

		const edge_child_dom = editor.getElementByKey(edge_child.__key)

		if (edge_child_dom == null) {
			return false
		}

		const edge_rect = edge_child_dom.getBoundingClientRect()
		const is_exiting =
			direction === 'up'
				? edge_rect.top > edge_selection_rect.top - edge_selection_rect.height
				: edge_selection_rect.bottom + edge_selection_rect.height > edge_rect.bottom

		if (is_exiting) {
			stopEvent(event)

			const cords = table_node.getCordsFromCellNode(anchor_cell_node, table_observer.table)

			if (event.shiftKey) {
				const cell = table_node.getDOMCellFromCords(cords.x, cords.y, table_observer.table)!

				table_observer.setAnchorCellForSelection(cell)
				table_observer.setFocusCellForSelection(cell)
			} else {
				return selectTableNodeInDirection(table_observer, table_node, cords.x, cords.y, direction)
			}

			return true
		}
	} else if ($isTableSelection(selection)) {
		const { anchor, focus } = selection
		const anchor_cell_node = $findMatchingParent(anchor.getNode(), $isTableCellNode) as TableCellNode
		const focus_cell_node = $findMatchingParent(focus.getNode(), $isTableCellNode) as TableCellNode

		const [table_node_from_selection] = selection.getNodes()
		const table_element = editor.getElementByKey(table_node_from_selection.getKey())

		if (
			!$isTableCellNode(anchor_cell_node) ||
			!$isTableCellNode(focus_cell_node) ||
			!$isTableNode(table_node_from_selection) ||
			table_element == null
		) {
			return false
		}

		table_observer.updateTableSelection(selection)

		const grid = getTable(table_element)
		const cords_anchor = table_node.getCordsFromCellNode(anchor_cell_node, grid)
		const anchor_cell = table_node.getDOMCellFromCords(cords_anchor.x, cords_anchor.y, grid)!

		table_observer.setAnchorCellForSelection(anchor_cell)

		stopEvent(event)

		if (event.shiftKey) {
			const cords = table_node.getCordsFromCellNode(focus_cell_node, grid)

			return adjustFocusNodeInDirection(
				table_observer,
				table_node_from_selection as TableNode,
				cords.x,
				cords.y,
				direction
			)
		} else {
			focus_cell_node.selectEnd()
		}

		return true
	}

	return false
}

export default Index
