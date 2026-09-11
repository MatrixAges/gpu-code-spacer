import type { LexicalEditor } from 'lexical'

export default (editor: LexicalEditor) => {
	editor.focus(() => editor.getRootElement()!.focus({ preventScroll: true }))
}
