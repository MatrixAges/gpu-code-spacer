import { COMMAND_PRIORITY_EDITOR } from 'lexical'
import { makeObservable } from 'mobx'

import { INSERT_DIVIDER_COMMAND } from '@/Editor/commands'
import { insertBlock } from '@/Editor/utils'
import { mergeRegister } from '@lexical/utils'

import { $createDividerNode } from './utils'

import type { LexicalEditor } from 'lexical'

export default class Index {
	editor = null as unknown as LexicalEditor

	unregister = null as unknown as () => void

	constructor() {
		makeObservable(this, {}, { autoBind: true })
	}

	init(editor: Index['editor']) {
		this.editor = editor

		this.register()
	}

	register() {
		this.unregister = mergeRegister(
			this.editor.registerCommand(
				INSERT_DIVIDER_COMMAND,
				_ => {
					return insertBlock($createDividerNode())
				},
				COMMAND_PRIORITY_EDITOR
			)
		)
	}

	off() {
		this.unregister()
	}
}
