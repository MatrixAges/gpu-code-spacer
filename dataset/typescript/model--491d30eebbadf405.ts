import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { module_default_icon } from '@/appdata'
import { Utils } from '@/models'
import { id } from '@/utils'
import { disableWatcher, loading } from '@/utils/decorators'
import { getDocItemsData } from '@/utils/rxdb'
import { DirTree as NodeTree } from '@openages/stk/common'
import { setStorageWhenChange } from '@openages/stk/mobx'

import { getQuery, insert, query, remove, update, updateItems } from './services'

import type { App, DirTree, Stack } from '@/types'
import type { Active, Over } from '@dnd-kit/core'
import type { Subscription } from 'rxjs'
import type { IProps } from './types'
import type { MoveData } from './types/model'

@injectable()
export default class Index {
	module = '' as App.ModuleType
	actions = {} as IProps['actions']

	focusing_index = [] as Array<number>
	current_item = {} as DirTree.Item
	current_option = '' as 'rename' | 'add_file' | 'add_dir' | ''

	modal_type = 'file' as DirTree.Item['type']
	modal_open = false

	open_dirtree = false
	open_folder = [] as Array<string>

	items_watcher = null as Subscription | null
	disable_watcher = false

	get focusing_item() {
		if (!this.focusing_index.length) return {} as DirTree.Item

		return (this.node_tree.getItem(this.focusing_index).cloned_item || {}) as DirTree.Item
	}

	constructor(
		public utils: Utils,
		public node_tree: NodeTree<DirTree.Item>
	) {
		makeAutoObservable(
			this,
			{ utils: false, node_tree: false, actions: false, items_watcher: false, disable_watcher: false },
			{ autoBind: true }
		)
	}

	async init(args: { module: App.ModuleType; actions: IProps['actions'] }) {
		const { module, actions } = args

		this.module = module
		this.actions = actions

		const disposer = setStorageWhenChange([{ [`${this.module}_open_folder`]: 'open_folder' }], this)

		this.on()
		this.watchItems()

		this.query()

		this.utils.acts.push(disposer)
	}

	@disableWatcher
	@loading
	async query() {
		const items = await query(this.module)

		const lost_tree = this.node_tree.init(getDocItemsData(items))

		if (lost_tree.length) {
			await updateItems(lost_tree as DirTree.Items)
		}
	}

	@disableWatcher
	@loading
	async insert(item: Partial<DirTree.Item>) {
		if (!item.icon && item.type === 'file') {
			item.icon = module_default_icon[this.module as 'pomo' | 'schedule' | 'note'] || ''
		}

		const target_id = item.id || id()

		const { item: target, effect_items } = this.node_tree.insert(
			{ ...item, id: target_id, module: this.module } as DirTree.Item,
			this.focusing_index
		)

		await insert({
			actions: this.actions,
			item: target as DirTree.Item,
			effect_items: effect_items as DirTree.Items
		})

		this.modal_open = false
		this.focusing_index = []
	}

	@disableWatcher
	async remove() {
		const focusing_item = $copy(this.focusing_item)
		const { remove_items, effect_items } = this.node_tree.remove(this.focusing_index)

		await remove({
			module: this.module,
			focusing_item: focusing_item,
			actions: this.actions,
			current_item_id: this.current_item.id,
			remove_items: remove_items as DirTree.Items,
			effect_items: effect_items as DirTree.Items
		})

		if (this.current_item.id === focusing_item.id) {
			this.current_item = {} as DirTree.Item
		}

		this.focusing_index = []
	}

	@disableWatcher
	@loading
	async update(item: Partial<DirTree.Item>) {
		this.node_tree.update(this.focusing_index, item)

		await update({ focusing_item: this.focusing_item, item })

		this.modal_open = false
		this.focusing_index = []
	}

	@disableWatcher
	async move(args: { active: Active; over: Over }) {
		const { active, over } = args

		if (!over?.id) return
		if (active.id === over.id) return

		const { parent_index: active_parent_index } = active.data.current as MoveData
		const { parent_index: over_parent_index, item: over_item } = over.data.current as MoveData

		const { effect_items } = this.node_tree.move({
			active_parent_index,
			over_parent_index,
			droppable: over_item.type === 'dir'
		})

		await updateItems(effect_items as DirTree.Items)
	}

	onOptions(type: 'add_dir' | 'add_file' | 'rename' | 'delete') {
		if (type === 'add_dir' || type === 'add_file' || type === 'rename') {
			this.current_option = type
			this.modal_open = true
		} else {
			this.remove()
		}
	}

	onClick(v: DirTree.Item) {
		if (!v?.id) return

		this.current_item = v

		$app.Event.emit('global.stack.add', {
			id: v.id,
			module: this.module,
			file: $copy(v),
			active: true,
			fixed: false,
			outlet: null
		} as Stack.View)
	}

	removeCurrentItem() {
		this.current_item = {} as DirTree.Item
	}

	addOpenFolder(id: string) {
		const open_folder = $copy(this.open_folder)

		if (!open_folder.includes(id)) {
			open_folder.push(id)
		}

		this.open_folder = open_folder
	}

	removeOpenFolder(id: string) {
		this.open_folder = this.open_folder.filter(item => item !== id)
	}

	watchItems() {
		this.items_watcher = getQuery(this.module).$.subscribe(items => {
			if (this.disable_watcher) return

			const lost_tree = this.node_tree.init(getDocItemsData(items))

			if (lost_tree.length) {
				updateItems(lost_tree as DirTree.Items)
			}
		})
	}

	on() {
		$app.Event.on(`${this.module}/dirtree/insert`, this.insert)
		$app.Event.on(`${this.module}/dirtree/move`, this.move)
		$app.Event.on(`${this.module}/dirtree/removeCurrentItem`, this.removeCurrentItem)
		$app.Event.on(`${this.module}/dirtree/addOpenFolder`, this.addOpenFolder)
		$app.Event.on(`${this.module}/dirtree/removeOpenFolder`, this.removeOpenFolder)
		$app.Event.on(`${this.module}/dirtree/update`, this.update)
	}

	off() {
		if (this.open_dirtree) this.open_dirtree = false

		this.utils.off()

		this.items_watcher?.unsubscribe?.()
		this.items_watcher = null

		$app.Event.off(`${this.module}/dirtree/insert`, this.insert)
		$app.Event.off(`${this.module}/dirtree/move`, this.move)
		$app.Event.off(`${this.module}/dirtree/removeCurrentItem`, this.removeCurrentItem)
		$app.Event.off(`${this.module}/dirtree/addOpenFolder`, this.addOpenFolder)
		$app.Event.off(`${this.module}/dirtree/removeOpenFolder`, this.removeOpenFolder)
		$app.Event.off(`${this.module}/dirtree/update`, this.update)
	}
}
