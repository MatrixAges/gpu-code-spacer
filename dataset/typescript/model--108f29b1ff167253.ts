import {
	$createParagraphNode,
	$getRoot,
	$isParagraphNode,
	BLUR_COMMAND,
	COMMAND_PRIORITY_CRITICAL,
	FOCUS_COMMAND
} from 'lexical'
import { injectable } from 'tsyringe'

import { mergeRegister } from '@lexical/utils'

import type { LexicalEditor } from 'lexical'

@injectable()
export default class Index {
	focus = false
	container = null as unknown as HTMLDivElement
	editor = null as unknown as LexicalEditor

	listener = null as unknown as () => void

	init(id: string, editor: Index['editor']) {
		this.container = document.getElementById(id) as HTMLDivElement
		this.editor = editor

		this.addListener()
		this.on()
	}

	onClick(e: MouseEvent) {
		const target = e.target as HTMLDivElement
		const root_el = this.editor.getRootElement() as HTMLDivElement

		if (this.focus) return

		if (
			!(
				target.classList.contains('__view_container') ||
				target.classList.contains('limited_content_wrap') ||
				target.classList.contains('__editor_container')
			) ||
			target.classList.contains('__editor_handler') ||
			target.closest('.__editor_handler')
		) {
			return
		}

		if (!root_el) return
		if (root_el.contains(target)) return

		const pass = this.editor.getEditorState().read(() => {
			const root = $getRoot()
			const last = root.getLastChild()

			if (
				last &&
				$isParagraphNode(last) &&
				this.editor.getEditorState().read(() => last.getTextContentSize()) === 0
			) {
				return false
			}

			return true
		})

		if (!pass) {
			return this.editor.update(() => {
				const root = $getRoot()
				const last = root.getLastChild()

				if (last && $isParagraphNode(last)) {
					last.select()
				}
			})
		}

		this.editor.update(() => {
			const root = $getRoot()
			const p = $createParagraphNode()

			root.append(p)

			if (p) p.select()
		})
	}

	addListener() {
		this.listener = mergeRegister(
			this.editor.registerCommand(
				FOCUS_COMMAND,
				() => {
					this.focus = true

					return false
				},
				COMMAND_PRIORITY_CRITICAL
			),
			this.editor.registerCommand(
				BLUR_COMMAND,
				() => {
					this.focus = false

					return false
				},
				COMMAND_PRIORITY_CRITICAL
			)
		)
	}

	removeListener() {
		this.listener?.()
	}

	on() {
		this.container.addEventListener('click', this.onClick.bind(this))
	}

	off() {
		this.container.removeEventListener('click', this.onClick.bind(this))
	}
}
