import { $getSelection, $insertNodes, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_EDITOR } from 'lexical'
import { makeObservable } from 'mobx'

import { INSERT_REF_COMMAND } from '@/Editor/commands'
import { mergeRegister } from '@lexical/utils'

import { $createRefNode } from './utils'

import type { LexicalEditor } from 'lexical'
import type { IPropsRef } from './types'

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
			this.editor.registerCommand<IPropsRef>(
				INSERT_REF_COMMAND,
				payload => {
					const selection = $getSelection()

					if (!$isRangeSelection(selection)) return false

					const node = $createRefNode(payload)

					$insertNodes([node])

					const prev_node = node.getPreviousSibling()

					if ($isTextNode(prev_node) && prev_node.getTextContent().at(-1) === ' ') {
						prev_node.spliceText(prev_node.getTextContentSize() - 1, 1, '', false)
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
