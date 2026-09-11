import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical'

import { text_nodes } from '@/Editor/nodes'

export default (text: string) => {
	const editor = createEditor({ nodes: text_nodes })

	editor._headless = true

	editor.update(
		() => {
			const p = $createParagraphNode()

			p.append($createTextNode(text))

			$getRoot().append(p)
		},
		{ discrete: true }
	)

	return editor.getEditorState().toJSON()
}
