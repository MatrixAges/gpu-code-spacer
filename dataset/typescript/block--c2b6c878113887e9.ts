import {
	$createParagraphNode,
	$getNodeByKey,
	$getSelection,
	$isNodeSelection,
	CLICK_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	KEY_ENTER_COMMAND
} from 'lexical'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS } from '@/Editor/commands'
import { removeAndCheck } from '@/Editor/utils'
import Utils from '@/models/utils'
import { mergeRegister } from '@lexical/utils'

import type { LexicalEditor } from 'lexical'
import type { MouseEvent } from 'react'

@injectable()
export default class Index {
	editor = null as unknown as LexicalEditor
	key = ''
	ref = null as unknown as HTMLElement

	selected = false

	setSelected = null as unknown as (v: boolean) => void
	clearSelection = null as unknown as () => void
	unregister = null as unknown as () => void

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{
				utils: false,
				editor: false,
				key: false,
				ref: false,
				setSelected: false,
				clearSelection: false,
				unregister: false
			},
			{ autoBind: true }
		)
	}

	init(
		editor: Index['editor'],
		key: Index['key'],
		setSelected: Index['setSelected'],
		clearSelection: Index['clearSelection']
	) {
		this.editor = editor
		this.key = key
		this.ref = this.editor.getElementByKey(this.key)!

		this.setSelected = setSelected
		this.clearSelection = clearSelection

		this.on()
	}

	onClick(e: MouseEvent<Element>) {
		if (this.selected) return true

		if (e.target === this.ref || this.ref.contains(e.target as HTMLElement)) {
			this.clearSelection()
			this.setSelected(true)

			return false
		}

		return false
	}

	onEnter() {
		if (!this.selected) return false

		const node = $getNodeByKey(this.key)!
		const p = $createParagraphNode()

		node.insertAfter(p)

		window.requestAnimationFrame(() => this.editor.update(() => p.selectEnd()))

		return true
	}

	onDelete(e: KeyboardEvent | MouseEvent) {
		const node = $getNodeByKey(this.key)!

		if ((e as MouseEvent).nativeEvent instanceof PointerEvent) {
			e.preventDefault()

			this.clearSelection()
			this.setSelected(true)

			this.editor.update(() => node.remove())

			return true
		}

		if (this.selected && $isNodeSelection($getSelection())) {
			e.preventDefault()

			removeAndCheck(node)

			return true
		}

		return false
	}

	checkSelection(path: Array<{ type: string; key: string }>) {
		if (path.find(item => item.key === this.key) !== undefined) {
			this.addListeners()
		} else {
			this.removeListeners()
		}

		return false
	}

	addListeners() {
		if (this.unregister) this.unregister()

		this.unregister = mergeRegister(
			this.editor.registerCommand<MouseEvent>(CLICK_COMMAND, this.onClick.bind(this), COMMAND_PRIORITY_LOW),
			this.editor.registerCommand(KEY_ENTER_COMMAND, this.onEnter.bind(this), COMMAND_PRIORITY_LOW),
			this.editor.registerCommand(KEY_DELETE_COMMAND, this.onDelete.bind(this), COMMAND_PRIORITY_LOW),
			this.editor.registerCommand(KEY_BACKSPACE_COMMAND, this.onDelete.bind(this), COMMAND_PRIORITY_LOW)
		)
	}

	removeListeners() {
		if (!this.unregister) return

		this.unregister()

		this.unregister = null as unknown as () => void
	}

	on() {
		this.utils.acts.push(
			this.editor.registerCommand(
				CHANGE_SELECTION_ELEMENTS,
				this.checkSelection.bind(this),
				COMMAND_PRIORITY_HIGH
			)
		)
	}

	off() {
		this.utils.off()

		this.removeListeners()
	}
}
