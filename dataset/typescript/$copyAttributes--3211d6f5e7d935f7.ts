import type { LexicalEditor, LexicalNode } from 'lexical'

export default (editor: LexicalEditor, target: LexicalNode, source: LexicalNode) => {
	const attributes = editor.getElementByKey(source.getKey())!.attributes
	const target_el = editor.getEditorState().read(() => editor.getElementByKey(target.getKey()))!

	for (let i = 0; i < attributes.length; i++) {
		const attribute = attributes[i]

		target_el.setAttribute(attribute.name, attribute.value)
	}
}
