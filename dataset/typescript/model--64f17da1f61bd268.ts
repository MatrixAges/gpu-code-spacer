import {
	$copyNode,
	$createParagraphNode,
	$createRangeSelection,
	$getNearestNodeFromDOMNode,
	$getRoot,
	$isDecoratorNode,
	$isParagraphNode,
	$setSelection,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	DRAGOVER_COMMAND,
	DROP_COMMAND
} from 'lexical'
import { throttle } from 'lodash-es'
import { makeAutoObservable, runInAction } from 'mobx'
import ntry from 'nice-try'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS } from '@/Editor/commands'
import { $cloneNode, $getHeadingLevel, $getMatchingParent } from '@/Editor/utils'
import Utils from '@/models/utils'
import { getComputedStyleValue } from '@/utils'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $isListItemNode, $isListNode } from '@lexical/list'
import { $isHeadingNode, eventFiles, HeadingNode } from '@lexical/rich-text'
import { $getNearestBlockElementAncestorOrThrow, isHTMLElement } from '@lexical/utils'

import { $isCodeNode } from '../Code/utils'
import { $isImageNode } from '../Image/utils'
import { $isKatexNode } from '../Katex/utils'
import { $isNavigationNode } from '../Navigation/utils'
import { $isQuoteNode } from '../Quote/utils'
import { $isRefNode } from '../Ref/utils'
import { $isTableCellNode, $isTableNode } from '../Table/utils'
import { $isToggleBodyNode, $isToggleBtnNode, $isToggleHeadNode, $isToggleNode } from '../Toggle/utils'

import type KatexNode from '../Katex/Node'
import type { DecoratorNode, LexicalEditor, LexicalNode } from 'lexical'
import type { DragEvent as ReactDragEvent } from 'react'
import type { ListNode } from '@lexical/list'

@injectable()
export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	md = false
	container = null as unknown as HTMLDivElement
	active_node = null as unknown as LexicalNode
	over_node = null as unknown as LexicalNode

	position_handler = { left: 0, top: 0 }
	style_line = { width: 0, left: 0, top: 0 }
	visible_handler = false
	visible_line = false
	visible_menu = false
	visible_toggle = false
	dragging = false
	fold = false
	is_heading = false

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{
				utils: false,
				id: false,
				editor: false,
				md: false,
				container: false,
				active_node: false,
				over_node: false,
				onMouseMove: false,
				onDragOver: false,
				onDrop: false
			},
			{ autoBind: true }
		)

		this.onMouseMove = throttle(this.onMouseMove.bind(this), 180)
	}

	init(id: Index['id'], editor: Index['editor'], md: Index['md']) {
		this.id = id
		this.editor = editor
		this.md = md
		this.container = document.querySelector(`#${id} .__editor_container`)!

		this.on()
	}

	reset() {
		if (!this.active_node) return

		this.active_node = null as unknown as LexicalNode
		this.over_node = null as unknown as LexicalNode
		this.position_handler = { left: 0, top: 0 }
		this.style_line = { width: 0, left: 0, top: 0 }
		this.visible_handler = false
		this.visible_line = false
		this.visible_toggle = false
		this.dragging = false
		this.fold = false
		this.is_heading = false

		return false
	}

	resetHiddenNodes() {
		const root = $getRoot()
		const children = root.getChildren()

		children.forEach(item => {
			const el = this.editor.getElementByKey(item.getKey())!

			if (el.classList.contains('__editor_fold')) el.classList.remove('__editor_fold')
			if (el.classList.contains('__editor_hidden')) el.classList.remove('__editor_hidden')
		})
	}

	resetHiddenList() {
		const next_node = this.over_node.getNextSibling()

		if (!next_node) return

		const next_el = this.editor.getElementByKey(next_node.getKey())

		if (!next_el) return

		if (!next_el.classList.contains('__editor_list_item_nested')) return

		const over_el = this.editor.getElementByKey(this.over_node.getKey())!

		over_el.classList.remove('__editor_fold')
		next_el.classList.remove('__editor_hidden')
	}

	onClick(args: { key: string; keyPath: Array<string> }) {
		if (!this.active_node) return

		const node_map = this.editor.getEditorState()._nodeMap

		if (!node_map.has(this.active_node.getKey())) {
			return this.reset()
		}

		const { key } = args

		if (key === 'copy_link') {
			const link = this.md
				? `#${this.active_node.getTextContent()}`
				: `block://${this.active_node.getKey()}`

			const link_node = $getMatchingParent((this.active_node as HeadingNode).getFirstChild()!, $isLinkNode)

			if (this.md && !link_node) {
				const active_key = this.active_node.getKey()
				const selection = $createRangeSelection()

				selection.anchor.set(active_key, 0, 'element')
				selection.focus.set(active_key, 0, 'element')

				$setSelection(selection)

				this.editor.dispatchCommand(TOGGLE_LINK_COMMAND, link_node ? null : link)
			}

			navigator.clipboard
				.writeText(link)
				.then(() =>
					$message.success(`${$t('common.link')}${$t('common.letter_space')}${$t('common.copied')}`)
				)

			return
		}

		if (key === 'clone') {
			const clone_node = $cloneNode(this.active_node)

			this.active_node.insertAfter(clone_node)

			clone_node.selectEnd()

			return
		}

		if (key === 'remove') {
			const prev_node = this.active_node.getPreviousSibling()
			const next_node = this.active_node.getNextSibling()

			this.active_node.remove()

			if (prev_node) {
				prev_node.selectEnd()
			} else {
				if (next_node) next_node.selectEnd()
			}

			this.reset()
		}
	}

	onToggle() {
		if (!this.active_node) return

		if ($isListItemNode(this.active_node)) {
			const next_node = this.active_node.getNextSibling()

			if (!next_node) return

			const next_el = this.editor.getElementByKey(next_node.getKey())

			if (!next_el) return

			if (!next_el.classList.contains('__editor_list_item_nested')) return

			const active_el = this.editor.getElementByKey(this.active_node.getKey())!
			const fold = next_el.classList.contains('__editor_hidden')

			if (fold) {
				active_el.classList.remove('__editor_fold')
				next_el.classList.remove('__editor_hidden')
			} else {
				active_el.classList.add('__editor_fold')
				next_el.classList.add('__editor_hidden')
			}

			this.fold = !fold
		}

		if ($isHeadingNode(this.active_node) && $getHeadingLevel(this.active_node) <= 4) {
			const active_level = $getHeadingLevel(this.active_node)
			const active_el = this.editor.getElementByKey(this.active_node.getKey())!
			const fold = active_el.classList.contains('__editor_fold')

			let child_node = this.active_node.getNextSibling()

			while (child_node) {
				if (
					!child_node ||
					($isHeadingNode(child_node) && $getHeadingLevel(child_node) <= active_level)
				) {
					break
				}

				const child_el = this.editor.getElementByKey(child_node.getKey())!

				if (fold) {
					child_el.classList.remove('__editor_hidden')
				} else {
					child_el.classList.add('__editor_hidden')
				}

				if (child_el.classList.contains('__editor_fold')) child_el.classList.remove('__editor_fold')

				child_node = child_node.getNextSibling()
			}

			if (fold) {
				active_el.classList.remove('__editor_fold')
			} else {
				active_el.classList.add('__editor_fold')
			}

			this.fold = !fold
		}

		this.active_node.selectEnd()
	}

	onMouseMove(e: MouseEvent) {
		const target = e.target!

		if (this.dragging) return
		if (!isHTMLElement(target)) return
		if (!target.closest('.__editor_root')) return
		if (target.closest('.__editor_draggable_handler')) return

		this.editor.update(() => {
			const active_node = this.getDragNode(e)

			if (!active_node) return this.reset()
			if (this.active_node && this.active_node.is(active_node)) return

			this.active_node = active_node

			const fold = this.getToggleNode(active_node)!

			runInAction(() => {
				this.position_handler = this.getNodePosition(this.active_node)
				this.visible_handler = true
				this.visible_menu = false
				this.visible_toggle = fold !== undefined ? true : false
				this.fold = fold
				this.is_heading = $isHeadingNode(active_node)
			})
		})
	}

	onDragStart(e: ReactDragEvent<HTMLDivElement>) {
		if (!e.dataTransfer || !this.active_node) return

		this.dragging = true
		this.visible_menu = false

		if ($isHeadingNode(this.active_node) && $getHeadingLevel(this.active_node) <= 4) {
			this.resetHiddenNodes()
		}

		const key = this.active_node.getKey()
		const el = this.editor.getElementByKey(key)!

		if ($isTableNode(this.active_node)) el.style.transform = 'translateZ(0)'

		e.dataTransfer.setDragImage(el, 0, 0)
	}

	onDragEnd(e: ReactDragEvent<HTMLDivElement>) {
		e.preventDefault()

		if (!this.active_node) return

		this.reset()
	}

	onDragOver(e: DragEvent) {
		e.preventDefault()

		if (!this.active_node) return false

		const target = e.target!
		const [is_file] = eventFiles(e)

		if (is_file) return
		if (!isHTMLElement(target)) return
		if (!target.closest('.__editor_root')) return

		this.editor.update(() => {
			const over_node = this.getDragNode(e)

			if (!over_node) return
			if (this.active_node && this.active_node.is(over_node)) return
			if (this.over_node && this.over_node.is(over_node)) return

			this.over_node = over_node

			const over_el = this.editor.getElementByKey(over_node.getKey())!

			if ($isListItemNode(over_node) && over_el.classList.contains('__editor_fold')) {
				this.resetHiddenList()
			}

			runInAction(() => {
				this.style_line = this.getNodePosition(this.over_node, true) as Index['style_line']
				this.visible_line = true
			})
		})

		return true
	}

	onDrop() {
		if (!this.active_node || !this.over_node) return

		if ($isListItemNode(this.active_node)) {
			const active_list_node = $getMatchingParent(this.active_node, $isListNode) as ListNode
			const over_list_node = $getMatchingParent(this.over_node, $isListNode)

			if (!over_list_node) {
				const target_list_node = $copyNode(active_list_node)

				target_list_node.append(this.active_node)

				this.over_node.insertAfter(target_list_node)

				return
			}
		}

		const active_parent_node = this.active_node.getParent()!

		if ($isTableCellNode(active_parent_node) && active_parent_node.getChildren().length === 1) {
			active_parent_node.append($createParagraphNode())
		}

		this.over_node.insertAfter(this.active_node)

		this.reset()

		return true
	}

	getDragNode(e: MouseEvent | DragEvent) {
		const target = e.target as HTMLElement
		const node = $getNearestNodeFromDOMNode(target)

		if (!node) return
		if (!node.getTextContent() && $isParagraphNode(node)) return

		if ($isToggleBtnNode(node)) {
			this.reset()

			return
		}

		if ($isListNode(node)) return
		if ($isRefNode(node)) return
		if ($isKatexNode(node) && (node as KatexNode).__inline) return

		if ($isDecoratorNode(node) && !(node as DecoratorNode<unknown> & { __inline: boolean }).__inline) {
			return node
		}

		const target_node = ntry(() => $getNearestBlockElementAncestorOrThrow(node))

		if (target_node) {
			const head_node = $getMatchingParent(target_node, $isToggleHeadNode)
			const toggle_node = $getMatchingParent(target_node, $isToggleNode)

			if (head_node || $isToggleBodyNode(target_node)) return toggle_node

			const table_node = $getMatchingParent(target_node, $isTableNode)
			const table_cell_node = $getMatchingParent(target_node, $isTableCellNode)

			if (table_node && table_cell_node && !table_cell_node.getTextContent().length) {
				return table_node
			}

			if ($isTableCellNode(target_node)) return
		}

		return target_node
	}

	getToggleNode(node: LexicalNode) {
		if ($isHeadingNode(node) && parseInt((node as HeadingNode).getTag().replace('h', '')) <= 4) {
			const active_el = this.editor.getElementByKey(node.getKey())!

			return active_el.classList.contains('__editor_fold')
		}

		const next_node = node.getNextSibling()

		if (!next_node) return

		const next_el = this.editor.getElementByKey(next_node.getKey())!

		if ($isListItemNode(next_node) && next_el.classList.contains('__editor_list_item_nested')) {
			return next_el.classList.contains('__editor_hidden')
		}
	}

	getNodePosition(node: LexicalNode, line?: boolean) {
		const el_node = this.editor.getElementByKey(node.getKey())!
		const rect_container = this.container.getBoundingClientRect()
		const rect_node = el_node.getBoundingClientRect()

		if (line) {
			return {
				width: rect_node.width,
				left: rect_node.left - rect_container.left,
				top: rect_node.top - rect_container.top + rect_node.height - 2
			}
		} else {
			let inline_padding = getComputedStyleValue(el_node, 'padding-inline-start')
			let block_padding = getComputedStyleValue(el_node, 'padding-block-start')
			let margin_left = 0
			let margin_top = 6

			if ($isListItemNode(node)) {
				margin_left = 18
			}

			if ($isParagraphNode(node) || $isHeadingNode(node)) {
				const line_height = getComputedStyleValue(el_node, 'line-height')

				margin_top = (line_height - 15) / 2
			}

			if (
				$isDecoratorNode(node) ||
				$isTableNode(node) ||
				$isQuoteNode(node) ||
				$isCodeNode(node) ||
				$isToggleNode(node)
			) {
				margin_top = 1
			}

			if ($isDecoratorNode(node) && !$isImageNode(node) && !$isNavigationNode(node)) {
				block_padding = 0
			}

			if ($isCodeNode(node) || $isQuoteNode(node)) {
				block_padding = 0
				inline_padding = 0
			}

			return {
				left: rect_node.left - rect_container.left - 19.2 - margin_left + inline_padding,
				top: rect_node.top - rect_container.top + margin_top + block_padding
			}
		}
	}

	checkSelection() {
		if (!this.active_node) return

		const el = this.editor.getElementByKey(this.active_node.getKey())

		if (el) return

		this.reset()
	}

	on() {
		const container = document.getElementById(this.id)!

		container.addEventListener('mousemove', this.onMouseMove)
		container.addEventListener('mouseleave', this.reset)

		this.utils.acts = [
			this.editor.registerCommand(DRAGOVER_COMMAND, this.onDragOver.bind(this), COMMAND_PRIORITY_LOW),
			this.editor.registerCommand(DROP_COMMAND, this.onDrop.bind(this), COMMAND_PRIORITY_HIGH),
			this.editor.registerCommand(
				CHANGE_SELECTION_ELEMENTS,
				this.checkSelection.bind(this),
				COMMAND_PRIORITY_LOW
			)
		]
	}

	off() {
		const container = document.getElementById(this.id)!

		container.removeEventListener('mousemove', this.onMouseMove)
		container.removeEventListener('mouseleave', this.reset)

		this.utils.off()
	}
}
