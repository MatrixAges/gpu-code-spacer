import { $getNodeByKey } from 'lexical'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { INSERT_REF_COMMAND } from '@/Editor/commands'
import RefNode from '@/Editor/plugins/Ref/Node'
import Utils from '@/models/utils'
import { getDocItem, getDocItemsData } from '@/utils'
import { setStorageWhenChange } from '@openages/stk/mobx'

import type { LexicalEditor } from 'lexical'
import type { App, DirTree, Schedule, Todo } from '@/types'
import type { RxDocument, MangoQuerySelector } from 'rxdb'

@injectable()
export default class Index {
	editor = null as unknown as LexicalEditor
	node_key = ''

	module = 'todo' as App.ModuleType
	latest_files = [] as Array<DirTree.Item>
	latest_items = [] as Array<{ item: any; file: DirTree.Item }>
	only_files = false
	compositing = false
	search_type = 'file' as 'item' | 'file'
	search_mode = false

	constructor(public utils: Utils) {
		makeAutoObservable(this, { editor: false, node_key: false }, { autoBind: true })
	}

	init(editor: Index['editor'], node_key: Index['node_key']) {
		this.utils.acts = [setStorageWhenChange(['module'], this, { useSession: true })]

		this.editor = editor
		this.node_key = node_key

		this.getLatestItems()
	}

	onChangeModule(v: Index['module']) {
		this.module = v
		this.search_mode = false

		this.getLatestItems()
	}

	onItem(type: 'file' | App.ModuleType, index: number) {
		const module = type === 'file' ? 'file' : this.module
		const id = type === 'file' ? this.latest_files[index].id : this.latest_items[index].item.id

		if (this.node_key) {
			this.editor.update(() => {
				const node = $getNodeByKey(this.node_key) as RefNode
				const target = node.getWritable()

				target.__module = module
				target.__id = id
			})
		} else {
			this.editor.dispatchCommand(INSERT_REF_COMMAND, { module, id })
		}
	}

	getLatestItems() {
		switch (this.module) {
			case 'todo':
				this.only_files = false

				this.getTodoLatestItems()
				break
			case 'note':
				this.only_files = true
				this.search_type = 'file'

				break
			case 'schedule':
				this.only_files = false

				this.getScheduleLatestItems()
				break
		}

		this.getLatestFiles()
	}

	search(v: string) {
		this.search_mode = !!v

		if (this.search_type === 'file') {
			return this.getSearchFiles(v)
		}

		switch (this.module) {
			case 'todo':
				this.getTodoLatestItems(v)
				break
			case 'schedule':
				this.getScheduleLatestItems(v)
				break
		}
	}

	async getSearchFiles(v: string) {
		const docs = await $db.dirtree_items
			.find({
				selector: {
					module: this.module,
					type: 'file',
					name: { $regex: `.*${v}.*`, $options: 'i' }
				},
				index: 'file_id'
			})
			.sort({ update_at: 'desc', create_at: 'desc' })
			.limit(15)
			.exec()

		this.latest_files = getDocItemsData(docs)
	}

	async getLatestFiles() {
		const docs = await $db.dirtree_items
			.find({ selector: { module: this.module, type: 'file' } })
			.sort({ update_at: 'desc', create_at: 'desc' })
			.limit(12)
			.exec()

		this.latest_files = getDocItemsData(docs)
	}

	async getTodoLatestItems(v?: string) {
		const selector = { type: 'todo', archive: false } as MangoQuerySelector<Todo.Todo>

		if (v) selector['text'] = { $regex: `.*${v}.*`, $options: 'i' }

		const docs = await $db.todo_items
			.find({ selector, index: 'file_id' })
			.sort({ update_at: 'desc', create_at: 'desc' })
			.limit(v ? 15 : 12)
			.exec()

		this.setLatestItems(docs)
	}

	async getScheduleLatestItems(v?: string) {
		const selector = { end_time: { $gt: new Date().valueOf() } } as MangoQuerySelector<Schedule.Item>

		if (v) selector['text'] = { $regex: `.*${v}.*`, $options: 'i' }

		const docs = await $db.schedule_items
			.find({ selector, index: 'file_id' })
			.sort({ update_at: 'desc', create_at: 'desc' })
			.limit(v ? 15 : 12)
			.exec()

		this.setLatestItems(docs)
	}

	async setLatestItems(docs: Array<RxDocument<any>>) {
		const file_ids = docs.map(item => item.file_id)

		const files = await $db.dirtree_items.findByIds(file_ids).exec()

		this.latest_items = file_ids.map((_, index) => ({
			item: getDocItem(docs[index]),
			file: getDocItem(files.get(docs[index].file_id)!)!
		}))
	}

	off() {
		this.utils.off()
	}
}
