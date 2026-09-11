import { $getNodeByKey, $insertNodes, $isTextNode, COMMAND_PRIORITY_EDITOR, COMMAND_PRIORITY_HIGH } from 'lexical'
import { injectable } from 'tsyringe'

import { CHANGE_SELECTION_ELEMENTS, INSERT_TABLE_COMMAND } from '@/Editor/commands'
import Utils from '@/models/utils'

import TableNode from './TableNode'
import { $createTableNodeWithDimensions, $isTableNode, $updateTableCols, applyTableHandlers } from './utils'

import type { HTMLTableElementWithWithTableSelectionState } from './types'
import type TableObserver from './TableObserver'
import type { LexicalEditor, NodeMutation } from 'lexical'

@injectable()
export default class Index {
	editor = null as unknown as LexicalEditor
	table_selections = {} as Record<string, TableObserver>

	constructor(public utils: Utils) {}

	init(editor: Index['editor']) {
		this.editor = editor

		this.on()
	}

	onInsert() {
		const table_node = $createTableNodeWithDimensions(3, 3)

		$insertNodes([table_node])

		const first_descendant = table_node.getFirstDescendant()

		if ($isTextNode(first_descendant)) {
			first_descendant.select()
		}

		return true
	}

	onMutation(mutations: Map<string, NodeMutation>) {
		for (const [node_key, mutation] of mutations) {
			if (mutation === 'created') {
				this.editor.getEditorState().read(() => {
					const table_node = $getNodeByKey<TableNode>(node_key)!

					if ($isTableNode(table_node)) {
						this.addObservers(node_key)
					}
				})
			} else if (mutation === 'destroyed') {
				const table_selection = this.table_selections[node_key]

				if (table_selection) {
					table_selection.removeListeners()

					delete this.table_selections[node_key]
				}
			}
		}
	}

	onTransformTable(node: TableNode) {
		const has_colspan = node.existColspan()

		if (has_colspan) {
			this.editor.update(() => {
				node.resetCols()

				const target = node.getWritable()

				target.__cols = []
			})
		} else {
			$updateTableCols(this.editor, node)
		}
	}

	checkSelection(path: Array<{ type: string; key: string }>) {
		const selection_keys = Object.keys(this.table_selections)

		selection_keys.forEach(key => {
			if (path.find(item => item.key === key) === undefined) {
				this.table_selections[key].removeListeners()

				delete this.table_selections[key]
			}
		})

		path.forEach(item => {
			if (item.type === 'table' && !this.table_selections[item.key]) {
				this.addObservers(item.key)
			}
		})

		return false
	}

	addObservers(key: string) {
		const table_node = $getNodeByKey(key) as TableNode
		const table_element = this.editor.getElementByKey(key) as HTMLTableElementWithWithTableSelectionState

		if (table_element && !this.table_selections[key]) {
			const table_selection = applyTableHandlers(table_node, table_element, this.editor)

			this.table_selections[key] = table_selection
		}
	}

	removeListeners() {
		for (const key in this.table_selections) {
			this.table_selections[key].removeListeners()
		}

		this.table_selections = {}
	}

	on() {
		this.utils.acts.push(
			this.editor.registerCommand(INSERT_TABLE_COMMAND, this.onInsert.bind(this), COMMAND_PRIORITY_EDITOR),
			this.editor.registerNodeTransform(TableNode, this.onTransformTable.bind(this)),
			this.editor.registerMutationListener(TableNode, this.onMutation.bind(this)),
			this.editor.registerCommand(
				CHANGE_SELECTION_ELEMENTS,
				this.checkSelection.bind(this),
				COMMAND_PRIORITY_HIGH
			)
		)
	}

	off() {
		this.utils.off()
	}
}
