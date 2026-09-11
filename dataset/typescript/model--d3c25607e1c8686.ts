import to from 'await-to-js'
import {
	$getNodeByKey,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_LOW,
	SELECTION_CHANGE_COMMAND
} from 'lexical'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { $getMatchingParent, prettier_langs } from '@/Editor/utils'
import Utils from '@/models/utils'
import { mergeRegister } from '@lexical/utils'
import { useInstanceWatch, Watch } from '@openages/stk/mobx'

import CodeNode from '../CodeNode'
import { $isCodeNode, $isCodeTextNode } from '../utils'

import type { LexicalEditor } from 'lexical'
import type { BundledLanguage } from 'shiki'

@injectable()
export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	key = ''
	resize_observer = null as unknown as ResizeObserver

	lang = '' as BundledLanguage
	formatable = false
	position = { left: 0, top: 0 }
	visible = false

	watch = {
		visible: v => {
			const container = document.getElementById(this.id)!

			if (v) {
				container.addEventListener('scroll', this.onScroll)

				this.resize_observer = new ResizeObserver(this.onScroll)

				this.resize_observer.observe(container)
			} else {
				container.removeEventListener('scroll', this.onScroll)

				if (!this.resize_observer) return
				if (container) this.resize_observer.unobserve(container)

				this.resize_observer.disconnect()
				this.resize_observer = null as unknown as ResizeObserver
			}
		}
	} as Watch<Index>

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{ utils: false, id: false, editor: false, key: false, resize_observer: false, watch: false },
			{ autoBind: true }
		)
	}

	init(id: Index['id'], editor: Index['editor']) {
		this.utils.acts = useInstanceWatch(this)

		this.id = id
		this.editor = editor

		this.register()
	}

	reset() {
		this.key = ''
		this.lang = '' as BundledLanguage
		this.formatable = false
		this.position = { left: 0, top: 0 }
		this.visible = false
	}

	getPosition(key: string) {
		const el = this.editor.getElementByKey(key)!

		if (!el) return

		const { right, top } = el.getBoundingClientRect()

		this.position = { left: right - (78 + 52 + 2), top: top - 32 }
	}

	onSelection() {
		const selection = $getSelection()

		if (!$isRangeSelection(selection)) return false

		const anchor = selection.anchor.getNode()

		if (!$isCodeTextNode(anchor) && !$isCodeNode(anchor)) {
			if (!this.key) return false

			this.reset()

			return false
		}

		const node = $getMatchingParent(anchor, $isCodeNode) as CodeNode

		if (this.key === node.__key) return false

		this.getPosition(node.__key)

		this.key = node.__key
		this.lang = node.__lang
		this.formatable = prettier_langs[node.__lang] ? true : false
		this.visible = true

		return false
	}

	onChangeLang(v: BundledLanguage) {
		if (!this.key) return

		this.editor.update(() => {
			const node = $getNodeByKey(this.key) as CodeNode
			const target = node.getWritable()

			target.__lang = v

			this.lang = v
			this.formatable = prettier_langs[v] ? true : false
		})
	}

	onCopy() {
		if (!this.key) return

		this.editor.getEditorState().read(() => {
			const node = $getNodeByKey(this.key)!
			const text = node.getTextContent()

			navigator.clipboard.writeText(text).then(() => {
				$message.success($t('common.copied'))
			})
		})
	}

	onScroll() {
		if (!this.key) return

		this.getPosition(this.key)
	}

	async onFormat() {
		if (!this.key || !this.formatable) return

		const { lang, text } = this.editor.getEditorState().read(() => {
			const node = $getNodeByKey(this.key) as CodeNode

			return { lang: node.__lang, text: node.getTextContent() }
		})

		const options = prettier_langs[lang]
		const plugins = await Promise.all(options.getPlugins())

		options.plugins = plugins

		const { format } = await import('prettier/standalone')
		const [err, target] = await to(format(text, options))

		if (err) {
			if (err.message) {
				$modal.error({
					title: $t('common.error'),
					content: err.message,
					centered: true,
					getContainer: () => document.getElementById(this.id)!
				})
			}

			return
		}

		this.editor.update(() => {
			const node = $getNodeByKey(this.key) as CodeNode

			const selection = node.select(0)

			selection.insertText(target.slice(0, -1))
		})
	}

	register() {
		const unregister = mergeRegister(
			this.editor.registerCommand(SELECTION_CHANGE_COMMAND, this.onSelection, COMMAND_PRIORITY_LOW)
		)

		this.utils.acts.push(unregister)
	}

	off() {
		this.utils.off()
	}
}
