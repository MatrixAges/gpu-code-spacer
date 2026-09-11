import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, COMMAND_PRIORITY_HIGH } from 'lexical'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS, INSERT_CODE_COMMAND } from '@/Editor/commands'
import { getSelectedNode } from '@/Editor/utils'
import Utils from '@/models/utils'

import { $createCodeNode } from '../Code/utils'
import { register } from './utils'

import type { LexicalEditor } from 'lexical'

@injectable()
export default class Index {
	editor = null as unknown as LexicalEditor

	unregister = null as unknown as () => void

	constructor(public utils: Utils) {}

	init(editor: Index['editor']) {
		this.editor = editor

		this.on()
	}

	onInsert() {
		const selection = $getSelection()

		if (!$isRangeSelection(selection)) return

		const selected_node = getSelectedNode(selection)
		const node = $createCodeNode({ lang: 'javascript' })

		selected_node.replace(node)

		return true
	}

	checkSelection(path: Array<{ type: string; key: string }>) {
		if (path.find(item => item.type === 'code') !== undefined) {
			this.addListeners()
		} else {
			this.removeListeners()
		}

		return false
	}

	addListeners() {
		if (this.unregister) this.unregister()

		this.unregister = register(this.editor)
	}

	removeListeners() {
		if (!this.unregister) return

		this.unregister()

		this.unregister = null as unknown as () => void
	}

	on() {
		this.utils.acts.push(
			this.editor.registerCommand(INSERT_CODE_COMMAND, this.onInsert.bind(this), COMMAND_PRIORITY_EDITOR),
			this.editor.registerCommand(
				CHANGE_SELECTION_ELEMENTS,
				this.checkSelection.bind(this),
				COMMAND_PRIORITY_HIGH
			)
		)
	}

	off() {
		this.utils.off()

		this.unregister?.()

		this.unregister = null as unknown as () => void
	}
}
