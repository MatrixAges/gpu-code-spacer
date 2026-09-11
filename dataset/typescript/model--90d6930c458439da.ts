import { COMMAND_PRIORITY_EDITOR } from 'lexical'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { SHOW_MODAL_COMMAND } from '@/Editor/commands'
import { $focus } from '@/Editor/utils'
import Utils from '@/models/utils'
import { mergeRegister } from '@lexical/utils'
import { setStorageWhenChange } from '@openages/stk/mobx'

import type { LexicalEditor } from 'lexical'
import type { TypeaheadMenuPluginProps } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import type Option from './option'
import type { IProps } from './types'

@injectable()
export default class Index {
	editor = null as unknown as LexicalEditor
	options = [] as Array<Option>
	text_mode = false as IProps['text_mode']

	modal = '' as 'Image' | 'Emoji' | 'Katex' | 'Mermaid' | 'Ref'
	node_key = ''
	query = ''
	index = null as unknown as number
	latest_blocks = [] as Array<number>

	unregister = null as unknown as () => void

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{ utils: false, editor: false, options: false, unregister: false },
			{ autoBind: true }
		)
	}

	init(editor: Index['editor'], text_mode: boolean) {
		if (!text_mode) {
			this.utils.acts = [setStorageWhenChange([{ note_latest_blocks: 'latest_blocks' }], this)]
		}

		this.editor = editor
		this.text_mode = text_mode

		this.register()
	}

	show(v: Index['modal']) {
		this.modal = v
		this.node_key = ''
	}

	close() {
		const node_key = this.node_key

		this.modal = '' as Index['modal']
		this.node_key = ''

		if (!node_key) return

		$focus(this.editor)
	}

	onSelectOption(...args: Parameters<TypeaheadMenuPluginProps<Option>['onSelectOption']>) {
		const [option, node, close, query_string] = args

		const index = this.options.findIndex(item => item.shortcut === option.shortcut)

		this.editor.update(() => {
			node?.remove()
			option.onSelect(query_string)

			close()

			if (!this.text_mode) this.setLatestBlocks(index)
		})
	}

	setLatestBlocks(v: number) {
		const exsit_index = this.latest_blocks.findIndex(item => item === v)

		if (exsit_index !== -1) {
			this.latest_blocks.splice(exsit_index, 1)
		} else {
			if (this.latest_blocks.length === 5) {
				this.latest_blocks.pop()
			}
		}

		this.latest_blocks.unshift(v)

		this.latest_blocks = $copy(this.latest_blocks)
	}

	register() {
		this.unregister = mergeRegister(
			this.editor.registerCommand<{ type: Index['modal']; node_key?: Index['node_key'] }>(
				SHOW_MODAL_COMMAND,
				payload => {
					const { type, node_key } = payload

					this.modal = type

					if (node_key) this.node_key = node_key

					return true
				},
				COMMAND_PRIORITY_EDITOR
			)
		)
	}

	off() {
		this.unregister()

		this.utils.off()
	}
}
