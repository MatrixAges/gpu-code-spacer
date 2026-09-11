import { $getRoot, createEditor, parseEditorState } from 'lexical'

import { note_nodes, text_nodes } from '@/Editor/nodes'
import { $restoreNodeFromJson } from '@/Editor/utils'

export default (state: string, fragment?: boolean) => {
	if (!state) return

	const editor = createEditor({ nodes: fragment ? note_nodes : text_nodes })

	editor._headless = true

	const json = JSON.parse(state)

	if (fragment) {
		editor.update(
			() => {
				const node = $restoreNodeFromJson(json, editor._nodes)

				$getRoot().append(node)
			},
			{ discrete: true }
		)
	} else {
		editor.setEditorState(parseEditorState(json, editor))
	}

	const text = editor.getEditorState().read(() => $getRoot().getTextContent())

	editor.reset()

	return text
}
