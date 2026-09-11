import { makeAutoObservable } from 'mobx'
import scrollIntoView from 'smooth-scroll-into-view-if-needed'
import { injectable } from 'tsyringe'

import { update } from '@/components/DirTree/services'
import { File } from '@/models'

import type { FocusEvent, ChangeEvent } from 'react'
import type { App } from '@/types'
import type { LexicalEditor } from 'lexical'

@injectable()
export default class Index {
	id = ''
	module = '' as App.ModuleType
	editor = null as unknown as LexicalEditor

	constructor(public file: File) {
		makeAutoObservable(this, { file: false, id: false, module: false, editor: false }, { autoBind: true })
	}

	init(args: { id: string }) {
		const { id } = args

		this.id = id

		this.file.init(id)

		this.on()
	}

	onChangeFileName(e: ChangeEvent<HTMLTextAreaElement>) {
		const name = e.target.value

		this.file.data = { ...this.file.data, name }
	}

	onBlurFileName(e: FocusEvent<HTMLTextAreaElement>) {
		const name = e.target.value

		if (!name) return

		const item = { id: this.id, name }

		if (this.module === 'note') {
			$app.Event.emit('note/dirtree/update', item)
		} else {
			update({ item })
		}
	}

	async redirect(id: string) {
		setTimeout(() => {
			const el = this.editor.getElementByKey(id)

			if (el) {
				scrollIntoView(el, { block: 'start' })

				el.classList.add('notice_text')

				setTimeout(() => {
					el.classList.remove('notice_text')
				}, 1500)
			}
		}, 300)
	}

	on() {
		window.$app.Event.on(`note/${this.id}/redirect`, this.redirect)
	}

	off() {
		this.file.off()

		window.$app.Event.off(`note/${this.id}/redirect`, this.redirect)
	}
}
