import { parseEditorState } from 'lexical'
import niceTry from 'nice-try'
import { useState } from 'react'

import { useCreateEffect } from '@/hooks'
import { deepEqual } from '@openages/stk/react'

import { $getEditorSize } from '../utils'

import type { RefObject } from 'react'
import type { LexicalEditor } from 'lexical'

interface Args {
	ref_editor: RefObject<LexicalEditor | undefined>
	text: string
}

export default (args: Args) => {
	const { ref_editor, text } = args
	const [editor_size, setEditorSize] = useState(0)

	useCreateEffect(() => {
		const editor = ref_editor.current

		if (!editor || !text) return

		const editor_state = JSON.stringify(editor.getEditorState().toJSON())

		if (deepEqual(text, editor_state)) return

		const state = niceTry(() => JSON.parse(text))

		if (!state) return

		const target_editor_state = parseEditorState(state, editor)
		const empty = target_editor_state.isEmpty()

		if (!empty) {
			editor.setEditorState(target_editor_state)
		}

		setEditorSize($getEditorSize(editor))
	}, [text])

	return { editor_size }
}
