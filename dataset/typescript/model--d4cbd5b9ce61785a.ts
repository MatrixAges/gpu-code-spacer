import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	BLUR_COMMAND,
	COMMAND_PRIORITY_CRITICAL,
	COMMAND_PRIORITY_EDITOR,
	FORMAT_TEXT_COMMAND,
	SELECTION_CHANGE_COMMAND
} from 'lexical'
import { makeAutoObservable } from 'mobx'

import { getSelectedNode } from '@/Editor/utils'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
	$isListNode,
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND
} from '@lexical/list'
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'

import { $isCodeTextNode } from '../Code/utils'

import type { LexicalEditor, LexicalNode, TextFormatType } from 'lexical'
import type { HeadingTagType } from '@lexical/rich-text'
import type { Formats, Format, ListType } from './types'
const text_formats = ['bold', 'italic', 'strikethrough', 'underline', 'code']

export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	md = false
	ref = null as unknown as HTMLElement
	node = null as unknown as LexicalNode
	oveflow_x = 0

	visible = false
	position = null as unknown as { x: number; y: number }
	formats = {} as Formats
	heading_type = '' as HeadingTagType
	list_type = '' as ListType

	timer_click = null as unknown as NodeJS.Timeout
	listener_blur = null as unknown as () => void
	unregister = null as unknown as () => void

	constructor() {
		makeAutoObservable(
			this,
			{
				editor: false,
				md: false,
				ref: false,
				node: false,
				oveflow_x: false,
				timer_click: false,
				listener_blur: false,
				unregister: false
			},
			{ autoBind: true }
		)
	}

	init(id: Index['id'], editor: Index['editor'], md: Index['md']) {
		this.id = id
		this.editor = editor
		this.md = md

		this.register()
	}

	reset() {
		if (!this.visible) return

		this.node = null!
		this.oveflow_x = 0
		this.visible = false
		this.position = null!
		this.formats = {} as Index['formats']
		this.heading_type = null!
		this.list_type = null!

		return false
	}

	updatePosition() {
		this.editor.update(() => {
			const selection = $getSelection()

			if (!$isRangeSelection(selection)) return this.reset()

			const native_selection = window.getSelection()!
			const rect = native_selection.getRangeAt(0)?.getBoundingClientRect?.()

			if (rect) this.position = { x: rect.left, y: rect.y - 42 }
		})
	}

	onMouseUp(e: MouseEvent) {
		if (this.ref === e.target || this.ref.contains(e.target as HTMLElement)) return

		this.editor.getEditorState().read(() => this.check())
	}

	onFormat(type: Format, v?: string) {
		if (text_formats.includes(type)) {
			this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, type as TextFormatType)
		} else {
			if (type === 'link') {
				if (this.formats['link']) {
					delete this.formats['link']

					this.editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
				} else {
					this.formats['link'] = true

					navigator.clipboard.readText().then(res => {
						if (
							res &&
							(res.startsWith('#') ||
								res.startsWith('block://') ||
								res.startsWith('https://'))
						) {
							this.editor.dispatchCommand(TOGGLE_LINK_COMMAND, res)
						} else {
							this.editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://')
						}
					})
				}
			} else if (type === 'heading') {
				if (v === this.heading_type) {
					this.unFormat()

					this.heading_type = '' as HeadingTagType
				} else {
					this.editor.update(() => {
						const selection = $getSelection()

						$setBlocksType(selection, () => $createHeadingNode(v as HeadingTagType))
					})
				}
			} else if (type === 'list') {
				if (v === this.list_type) {
					this.unFormat()

					this.list_type = '' as ListType
				} else {
					const commands = {
						bullet: INSERT_UNORDERED_LIST_COMMAND,
						number: INSERT_ORDERED_LIST_COMMAND,
						check: INSERT_CHECK_LIST_COMMAND
					}

					this.editor.dispatchCommand(commands[v as keyof typeof commands], null!)
				}
			}
		}
	}

	unFormat() {
		this.editor.update(() => {
			const selection = $getSelection()

			$setBlocksType(selection, () => $createParagraphNode())
		})
	}

	check() {
		const selection = $getSelection()

		if (!$isRangeSelection(selection)) return

		const nodes = selection.getNodes()

		if ($isCodeTextNode(nodes.at(-1))) return

		const root = this.editor.getRootElement()
		const native_selection = window.getSelection()
		const active_element = document.activeElement

		const is_contain = root?.contains(native_selection?.anchorNode!)
		const is_editable = this.editor.isEditable()
		const is_not_select = selection.anchor.offset === selection.focus.offset
		const is_collapsed = native_selection?.isCollapsed
		const is_composing = this.editor.isComposing()
		const is_select_none = !native_selection?.toString()?.trim()?.length

		if (
			!native_selection ||
			!active_element ||
			!root ||
			!is_contain ||
			!is_editable ||
			is_not_select ||
			is_collapsed ||
			is_composing ||
			is_select_none
		) {
			return this.reset()
		}

		this.formats = {} as Formats
		this.node = getSelectedNode(selection)

		if (selection.hasFormat('bold')) this.formats['bold'] = true
		if (selection.hasFormat('italic')) this.formats['italic'] = true
		if (selection.hasFormat('strikethrough')) this.formats['strikethrough'] = true
		if (selection.hasFormat('underline')) this.formats['underline'] = true
		if (selection.hasFormat('code')) this.formats['code'] = true

		if ($isLinkNode(this.node) || $isLinkNode(this.node.getParent())) {
			this.formats['link'] = true
		}

		const parent_heading_node = $findMatchingParent(this.node, $isHeadingNode)
		const parent_list_node = $findMatchingParent(this.node, $isListNode)

		if (parent_heading_node) {
			this.formats['heading'] = true
			this.heading_type = parent_heading_node.getTag()
		}

		if (parent_list_node) {
			this.formats['list'] = true
			this.list_type = parent_list_node.getListType() as ListType
		}

		const rect = native_selection.getRangeAt(0)?.getBoundingClientRect?.()

		if (rect) {
			this.visible = true
			this.position = { x: rect.left, y: rect.y - 42 }
		}
	}

	addBlurListener() {
		this.removeBlurListener()

		this.listener_blur = this.editor.registerCommand(
			BLUR_COMMAND,
			() => {
				if (this.visible) {
					this.reset()
					this.removeBlurListener()
				}

				return false
			},
			COMMAND_PRIORITY_EDITOR
		)
	}

	removeBlurListener() {
		this.listener_blur?.()

		this.listener_blur = null as unknown as () => void
	}

	onClick(e: MouseEvent) {
		if (e.target && (e.target as HTMLElement).closest('.__editor_text_bar')) {
			this.removeBlurListener()
		} else {
			this.addBlurListener()
		}
	}

	addClickListener() {
		this.removeClickListener()

		const el = document.getElementById(this.id)!

		el.addEventListener('mousedown', this.onClick)
	}

	removeClickListener() {
		const el = document.getElementById(this.id)!

		el.removeEventListener('mousedown', this.onClick)
	}

	register() {
		this.unregister = mergeRegister(
			this.editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				(_, active_editor) => {
					this.editor = active_editor

					this.check()

					return false
				},
				COMMAND_PRIORITY_CRITICAL
			),
			this.editor.registerUpdateListener(() => {
				this.editor.getEditorState().read(() => this.check())
			})
		)
	}

	off() {
		this.unregister()
		this.removeBlurListener()
	}
}
