import { $insertNodes, COMMAND_PRIORITY_EDITOR } from 'lexical'
import { makeObservable } from 'mobx'

import { INSERT_KATEX_COMMAND } from '@/Editor/commands'
import { insertBlock } from '@/Editor/utils'
import { mergeRegister } from '@lexical/utils'

import { $createKatexNode } from './utils'

import type { LexicalEditor } from 'lexical'
import type { IPropsKatex } from './types'

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
			this.editor.registerCommand<IPropsKatex>(
				INSERT_KATEX_COMMAND,
				payload => {
					const node = $createKatexNode(payload)

					if (payload.inline) {
						$insertNodes([node])
					} else {
						insertBlock(node)
					}

					return true
				},
				COMMAND_PRIORITY_EDITOR
			)
		)
	}

	off() {
		this.unregister()
	}
}
