import { $getRoot } from 'lexical'
import { throttle } from 'lodash-es'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import transformers from '@/Editor/transformers'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@/Editor/utils'
import { File } from '@/models'
import { convertFile, downloadFile, uploadFile } from '@/utils'
import { confirm } from '@/utils/antd'

import type { CSSProperties } from 'react'
import type { LexicalEditor } from 'lexical'

@injectable()
export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	container = null as unknown as HTMLElement
	observer = null as unknown as ResizeObserver

	style = {} as CSSProperties
	visible_options = false

	unregister = null as unknown as () => void

	constructor(public file: File) {
		makeAutoObservable(
			this,
			{
				file: false,
				id: false,
				editor: false,
				container: false,
				observer: false,
				unregister: false
			},
			{ autoBind: true }
		)
	}

	init(id: Index['id'], editor: Index['editor']) {
		this.id = id
		this.editor = editor
		this.container = document.getElementById(this.id)!

		this.file.init(id)

		this.getPosition()
		this.on()
	}

	getPosition() {
		const { right, top } = this.container.getBoundingClientRect()

		this.style = { left: right - 42, top: top + 18 }
	}

	exportMd() {
		const res = $convertToMarkdownString(transformers, null!, false)

		downloadFile(this.file.data.name, res, 'md')
	}

	async importMd() {
		const content_size = this.editor.getEditorState().read(() => $getRoot().getTextContentSize())

		if (content_size) {
			const res = await confirm({
				id: this.id,
				title: $t('common.notice'),
				content: $t('editor.Options.import.warning')
			})

			if (!res) return
		}

		const files = await uploadFile({ accept: '.md' })

		if (!files) return

		const text = await convertFile(files[0])

		this.editor.update(() => {
			$convertFromMarkdownString(text, transformers, $getRoot(), false, { import: true })
		})
	}

	on() {
		this.observer = new ResizeObserver(throttle(this.getPosition, 60))

		this.observer.observe(this.container)
	}

	off() {
		this.file.off()

		if (this.observer) {
			this.observer.unobserve(this.container)
			this.observer.disconnect()
		}
	}
}
