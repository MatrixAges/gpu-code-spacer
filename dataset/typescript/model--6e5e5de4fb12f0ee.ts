import { $getRoot, BLUR_COMMAND, COMMAND_PRIORITY_LOW, FOCUS_COMMAND, KEY_DOWN_COMMAND, UNDO_COMMAND } from 'lexical'
import { debounce } from 'lodash-es'

import { mergeRegister } from '@lexical/utils'

import type { IPropsTextLoader } from './types'

import type { Lexical } from '@/types'
import type { LexicalEditor } from 'lexical'

export default class Index {
	editor = null as unknown as LexicalEditor
	max_length = 0
	linebreak = false

	onChange = null as unknown as IPropsTextLoader['onChange']
	onKeyDown = null as unknown as IPropsTextLoader['onKeyDown']
	onFocus = null as unknown as IPropsTextLoader['onFocus']
	unregister = null as unknown as () => void

	listener_keydown = null as unknown as () => void
	listener_focus = null as unknown as () => void

	init(
		editor: Index['editor'],
		max_length: Index['max_length'],
		linebreak: Index['linebreak'],
		onChange: Index['onChange'],
		onKeyDown: Index['onKeyDown'],
		onFocus: Index['onFocus']
	) {
		this.editor = editor
		this.max_length = max_length
		this.linebreak = linebreak

		this.onChange = onChange

		if (onKeyDown) this.onKeyDown = onKeyDown

		if (onFocus) {
			this.onFocus = onFocus

			this.addFocusListener()
		}

		this.on()

		if (!this.linebreak) {
			this.addKeyDownListener()
		}
	}

	onUpdate(args: Lexical.ArgsUpdateListener) {
		if (this.editor.isComposing()) return

		const { editorState } = args

		if (this.max_length) {
			const text = editorState.read(() => $getRoot().getTextContent())

			if (text.length > this.max_length) {
				$message.error(`${$t('editor.over_limit')}: ${text.length}/${this.max_length}`, 3)

				this.editor.dispatchCommand(UNDO_COMMAND, null as unknown as void)
			}
		}

		this.onChange(JSON.stringify(editorState.toJSON()))
	}

	addKeyDownListener() {
		this.listener_keydown = this.editor.registerCommand(
			KEY_DOWN_COMMAND,
			e => {
				this.onKeyDown?.(e)

				if (e.key === 'Enter') {
					e.preventDefault()

					return true
				}

				return false
			},
			COMMAND_PRIORITY_LOW
		)
	}

	removeKeyDownListener() {
		this.listener_keydown?.()
	}

	addFocusListener() {
		this.listener_focus = mergeRegister(
			this.editor.registerCommand(
				FOCUS_COMMAND,
				() => {
					this.onFocus!(true)

					return false
				},
				COMMAND_PRIORITY_LOW
			),
			this.editor.registerCommand(
				BLUR_COMMAND,
				() => {
					this.onFocus!(false)

					return false
				},
				COMMAND_PRIORITY_LOW
			)
		)
	}

	removeFocusListener() {
		this.listener_focus?.()
	}

	on() {
		const onUpdate = debounce(this.onUpdate.bind(this), 450)

		this.unregister = mergeRegister(this.editor.registerUpdateListener(onUpdate))
	}

	off() {
		this.unregister?.()

		this.removeKeyDownListener()
		this.removeFocusListener()
	}
}
