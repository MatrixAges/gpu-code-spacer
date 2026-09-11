import {
	$getNearestNodeFromDOMNode,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
	CLICK_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW
} from 'lexical'
import { makeAutoObservable } from 'mobx'
import smoothScrollIntoView from 'smooth-scroll-into-view-if-needed'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS } from '@/Editor/commands'
import { $getMatchingParent } from '@/Editor/utils'
import Utils from '@/models/utils'
import { $isAutoLinkNode, $isLinkNode } from '@lexical/link'
import { mergeRegister } from '@lexical/utils'

import type { LexicalEditor, LexicalNode } from 'lexical'
import type { LinkNode } from '@lexical/link'
import type { FocusEvent } from 'react'

@injectable()
export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	node = null as unknown as LinkNode
	dom = null as unknown as HTMLAnchorElement
	show_on_top = false

	visible = false
	position = null as unknown as { x: number; y: number }
	link = ''

	unregister = null as unknown as () => void

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{ utils: false, id: false, editor: false, node: false, dom: false, unregister: false },
			{ autoBind: true }
		)
	}

	init(id: Index['id'], editor: Index['editor'], show_on_top: Index['show_on_top']) {
		this.id = id
		this.editor = editor
		this.show_on_top = show_on_top

		this.on()
	}

	reset() {
		this.node = null as unknown as LinkNode
		this.dom = null as unknown as HTMLAnchorElement

		this.visible = false
		this.position = null as unknown as { x: number; y: number }
		this.link = ''

		return false
	}

	onChange(e: FocusEvent<HTMLInputElement>) {
		e.preventDefault()

		if (!this.node) return

		this.editor.update(() => {
			const target = this.node.getWritable()

			if (e.target.value === target.__url) return

			target.__url = e.target.value
		})
	}

	getLinkNode() {
		const selection = $getSelection()

		let node: LexicalNode

		if ($isRangeSelection(selection)) node = selection.anchor.getNode()
		if ($isNodeSelection(selection)) node = selection.getNodes()[0]

		const target = ($getMatchingParent(node!, $isLinkNode) ||
			$getMatchingParent(node!, $isAutoLinkNode)) as LinkNode

		if (target) {
			this.node = target
			this.link = target.getURL()
			this.dom = this.editor.getElementByKey(target.__key) as HTMLAnchorElement

			return target
		} else {
			this.reset()

			return null
		}
	}

	updatePosition() {
		if (!this.node || !this.visible) return

		const rect = this.editor.getElementByKey(this.node.getKey())!.getBoundingClientRect()

		this.position = { x: rect.x, y: rect.y + (this.show_on_top ? -42 : rect.height) }
	}

	check(e?: MouseEvent) {
		const node = this.getLinkNode()

		if (!node) return false

		if (e && (!this.editor.isEditable() || e.metaKey || e.ctrlKey)) {
			const url = this.node.getURL()

			let el = null as unknown as HTMLElement

			if (url.startsWith('#')) {
				const container = document.getElementById(this.id)!

				const els = container.querySelectorAll<HTMLElement>(`a[href="${url}"]`)

				els.forEach((element: HTMLElement) => {
					const node = $getNearestNodeFromDOMNode(element)!

					if (`#${node.getTextContent()}` === url) {
						el = element
					}
				})
			}

			if (url.startsWith('block://')) {
				const key = url.replace('block://', '')

				el = this.editor.getElementByKey(key)!
			}

			if (el) {
				smoothScrollIntoView(el)

				el.classList.add('notice_text')

				setTimeout(() => {
					el.classList.remove('notice_text')
				}, 1500)

				return true
			}

			window.open(url, '_blank')
		} else {
			this.visible = true

			this.updatePosition()
		}

		return true
	}

	checkSelection(path: Array<{ type: string; key: string }>) {
		const tables = path.filter(item => item.type === 'link' || item.type === 'autolink')

		if (tables.length) {
			this.removeListners()
			this.addListners()
		} else {
			this.reset()
			this.removeListners()
		}

		return false
	}

	addListners() {
		this.removeListners()

		this.unregister = mergeRegister(
			this.editor.registerCommand(CLICK_COMMAND, this.check, COMMAND_PRIORITY_LOW)
		)
	}

	removeListners() {
		if (this.unregister) this.unregister()

		this.unregister = null as unknown as () => void
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
