import {
	$createNodeSelection,
	$createParagraphNode,
	$getRoot,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
	$setSelection,
	COMMAND_PRIORITY_CRITICAL,
	DELETE_CHARACTER_COMMAND,
	RootNode,
	SELECTION_CHANGE_COMMAND
} from 'lexical'
import { injectable } from 'tsyringe'

import blocks from '@/Editor/blocks'
import { CHANGE_EDITOR_SETTINGS, CHANGE_SELECTION_ELEMENTS } from '@/Editor/commands'
import { $getSelectionType } from '@/Editor/utils'
import { mergeRegister } from '@lexical/utils'
import { deepEqual } from '@openages/stk/react'

import type { LexicalEditor, LexicalNode, BaseSelection } from 'lexical'
import type { ArgsKV } from '@/types'

@injectable()
export default class Index {
	editor = null as unknown as LexicalEditor
	path = [] as Array<{ type: string; key: string }>
	selection = null as unknown as BaseSelection

	unregister = null as unknown as () => void

	constructor() {}

	init(editor: Index['editor']) {
		this.editor = editor

		this.on()
	}

	watch() {
		const selection = $getSelection()

		if (!selection) return

		let nodes: Array<LexicalNode> = selection.getNodes()

		if ($isRangeSelection(selection)) {
			const anchor = selection.anchor
			const focus = selection.focus

			if (anchor.offset !== focus.offset) return

			nodes = anchor.getNode().getParents()

			if (anchor.key !== focus.key) {
				const select_nodes = selection.getNodes().reverse()

				select_nodes.forEach(item => {
					if (nodes.findIndex(n => n.__key === item.__key) === -1) {
						nodes.unshift(item)
					}
				})
			}
		}

		if ($isNodeSelection(selection)) {
			const node = selection.getNodes()[0]

			if (!node) return

			nodes = [node, ...node.getParents()]
		}

		const path = nodes.map(item => ({ type: item.getType(), key: item.getKey() }))

		const prev_selection_type = $getSelectionType(this.selection)
		const current_selection_type = $getSelectionType(selection)

		if (deepEqual(path, this.path) && prev_selection_type === current_selection_type) return

		this.editor.dispatchCommand(CHANGE_SELECTION_ELEMENTS, path)

		this.path = path
		this.selection = selection

		return false
	}

	onChangeSettings(args: ArgsKV) {
		const { key, value } = args

		this.editor.settings[key] = value
	}

	onDelete() {
		const selection = $getSelection()

		if (!$isRangeSelection(selection)) return

		const nodes = selection.getNodes()

		if (nodes.length === 1) {
			const node = nodes[0]
			const key = node.getKey()

			if (!blocks.includes(node.getType())) return false

			this.editor.update(() => {
				const selection = $createNodeSelection()

				selection.add(key)

				$setSelection(selection)
			})

			return true
		}

		return false
	}

	onRootTranform(root: RootNode) {
		if (!root.getChildren().length) {
			root.append($createParagraphNode())
		}
	}

	on() {
		this.unregister = mergeRegister(
			this.editor.registerNodeTransform(RootNode, this.onRootTranform.bind(this)),
			this.editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				this.watch.bind(this),
				COMMAND_PRIORITY_CRITICAL
			),
			this.editor.registerCommand(
				CHANGE_EDITOR_SETTINGS,
				this.onChangeSettings.bind(this),
				COMMAND_PRIORITY_CRITICAL
			),
			this.editor.registerCommand(
				DELETE_CHARACTER_COMMAND,
				this.onDelete.bind(this),
				COMMAND_PRIORITY_CRITICAL
			)
		)
	}

	off() {
		this.unregister()
	}
}
