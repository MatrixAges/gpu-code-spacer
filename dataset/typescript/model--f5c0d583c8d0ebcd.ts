import { $getNodeByKey, $getRoot, $getSelection, $isRangeSelection, $setSelection, parseEditorState } from 'lexical'
import { uniq } from 'lodash-es'
import { injectable } from 'tsyringe'

import {
	$exportNodeToJson,
	$getEditorSize,
	$getMatchingParent,
	$getRemovedParent,
	$getTopLevelNode,
	$restoreNodeFromJson,
	getStateJson
} from '@/Editor/utils'
import { getDocItem, getDocItemsData } from '@/utils'
import { disableWatcher } from '@/utils/decorators'
import { mergeRegister } from '@lexical/utils'
import { deepEqual } from '@openages/stk/react'

import type { LexicalEditor } from 'lexical'
import type { Subscription } from 'rxjs'
import type { IPropsDataLoader, Change } from './types'
import type { Note } from '@/types'
import type { Lexical } from '@/types'

@injectable()
export default class Index {
	collection: IPropsDataLoader['collection'] = 'note_items'
	id = ''
	editor = null as unknown as LexicalEditor
	total_watcher = null as unknown as Subscription
	update_watchers = [] as Array<Subscription>
	ids_array = [] as Array<string>
	ids_map = new Map<string, undefined>()
	disable_watcher = false
	loaded = false
	mutation_load_status = false
	update_load_status = 1
	timer_change = null as unknown as NodeJS.Timer
	changes = new Map<string, Change>()
	undo_stack = [] as Array<Array<string>>
	redo_stack = [] as Array<Array<string>>

	unregister = null as (() => void) | null

	async init(collection: Index['collection'], id: Index['id'], editor: Index['editor']) {
		this.collection = collection
		this.id = id
		this.editor = editor

		await this.getData()

		this.on()
	}

	async getData() {
		const parent = this.editor!.getRootElement()!.parentElement!
		const placeholer = parent.querySelector('.__editor_placeholder') as HTMLDivElement

		if (placeholer && $getEditorSize(this.editor)) {
			placeholer.classList.add('__editor_hidden')
		}

		const docs = await $db.collections[this.collection].find({ selector: { file_id: this.id } }).exec()
		const items = getDocItemsData(docs)

		if (!items.length) {
			const { key, content } = this.editor.getEditorState().read(() => {
				const root = $getRoot()
				const node = root.getFirstChild()!

				return { key: node.getKey(), content: JSON.stringify($exportNodeToJson(node)) }
			})

			this.ids_array.push(key)
			this.ids_map.set(key, undefined)

			await $db.note_items.insert({
				file_id: this.id,
				id: key,
				prev: undefined,
				next: undefined,
				content,
				create_at: new Date().valueOf()
			})

			return placeholer.classList.remove('__editor_hidden')
		} else {
			const res = getStateJson(items, key => {
				this.ids_array.push(key)
				this.ids_map.set(key, undefined)
			})

			if (!res) return

			const { state, effect_items } = res

			this.editor.setEditorState(parseEditorState(state, this.editor))
			this.editor.focus(undefined, { defaultSelection: 'rootStart' })

			if (effect_items.length) {
				this.dispatch(
					effect_items.map(({ id }) => ({ type: 'update', id })),
					'update'
				)
			}
		}
	}

	async onUpdate(args: Lexical.ArgsUpdateListener | null) {
		if (!this.loaded) return (this.loaded = true)
		if (!args) return
		if (this.editor.isComposing()) return

		const { dirtyElements, dirtyLeaves, editorState, prevEditorState, tags } = args
		const dirty_els = $copy(dirtyElements)
		const curr_map = editorState._nodeMap
		const prev_map = prevEditorState._nodeMap

		let change_nodes: Array<string> = []

		dirty_els.delete('root')

		if (tags.has('undo') && this.undo_stack.length && dirtyElements.size) {
			change_nodes = this.undo_stack.pop()!

			this.redo_stack.push(change_nodes)
		} else if (tags.has('redo') && this.redo_stack.length && dirtyElements.size) {
			change_nodes = this.redo_stack.pop()!

			this.undo_stack.push(change_nodes)
		} else {
			change_nodes = uniq(
				Array.from(dirty_els.keys())
					.concat(Array.from(dirtyLeaves))
					.map(item =>
						editorState.read(() => {
							const node = $getNodeByKey(item)

							if (node?.__parent !== 'root') {
								if (node) {
									return $getTopLevelNode(node).getKey()
								} else {
									return $getRemovedParent(item, prev_map)
								}
							}

							return item
						})
					)
					.filter(item => item)
			) as Array<string>
		}

		if (!change_nodes.length) return

		if (!tags.has('undo') && !tags.has('redo')) {
			if (this.undo_stack.length >= 30) {
				this.undo_stack.shift()
			}

			this.undo_stack.push(change_nodes)
		}

		clearTimeout(this.timer_change)

		const add_nodes = [] as Array<string>
		const remove_nodes = [] as Array<string>

		change_nodes.forEach(id => {
			const curr_node = curr_map.get(id)
			const prev_node = prev_map.get(id)

			if (curr_node && !prev_node) {
				add_nodes.push(id)
			}

			if (!curr_node && prev_node) {
				remove_nodes.push(id)
			}

			if (curr_node && prev_node) {
				if (curr_node.__parent === 'root' && curr_node.__parent !== prev_node.__parent) {
					add_nodes.push(id)
				} else {
					this.changes.set(id, { type: 'update', id })
				}
			}
		})

		if (add_nodes.length) {
			this.dispatch(
				add_nodes.map(id => ({ type: 'add', id })),
				'add'
			)
		}

		if (remove_nodes.length) {
			this.dispatch(
				remove_nodes.map(id => ({ type: 'remove', id })),
				'remove'
			)
		}

		this.timer_change = setTimeout(() => {
			this.dispatch()
		}, 1200)
	}

	@disableWatcher
	async dispatch(changes?: Array<Change>, bulk_type?: 'add' | 'remove' | 'update') {
		const target = changes || Array.from(this.changes.values())

		if (changes && bulk_type) this.removeUpdateListner()

		const events = target.map(async ({ type, id }) => {
			let prev: string = ''
			let next: string = ''
			let content: string = ''

			if (type === 'add' || type === 'update') {
				const res = this.getNodeData(id)

				if (!res) return

				prev = res.prev!
				next = res.next!
				content = res.content
			}

			switch (type) {
				case 'add':
					this.ids_array.push(id)
					this.ids_map.set(id, undefined)

					await $db.note_items.insert({
						file_id: this.id,
						id,
						prev,
						next,
						content,
						create_at: new Date().valueOf()
					})

					break
				case 'remove':
					this.ids_array = this.ids_array.filter(v => v !== id)

					if (this.ids_map.has(id)) this.ids_map.delete(id)

					await $db.note_items.findOne(id)?.remove?.()

					break
				case 'update':
					const item = (await $db.note_items.findOne(id).exec())!

					const euqal_prev = item.prev === prev
					const euqal_next = item.next === next
					const euqal_content = deepEqual(item.content, content)

					const target = {} as Partial<Note.Item>

					if (!euqal_prev) target['prev'] = prev
					if (!euqal_next) target['next'] = next
					if (!euqal_content) target['content'] = content

					if (Object.keys(target).length) {
						await item.updateCRDT({ ifMatch: { $set: target } })
					}

					break
			}
		})

		await Promise.all(events)

		if (changes && bulk_type) this.addUpdateListner()
		if (!changes) this.changes.clear()
	}

	getNodeData(id: string) {
		return this.editor.getEditorState().read(() => {
			const node = $getNodeByKey(id)

			if (!node) return null

			const content = JSON.stringify($exportNodeToJson(node))

			return { prev: node.__prev, next: node.__next, content }
		})
	}

	addEditorListner() {
		this.unregister = mergeRegister(this.editor.registerUpdateListener(this.onUpdate.bind(this)))

		this.onUpdate(null)
	}

	addMutationListner() {
		this.total_watcher = $db.collections[this.collection]
			.find({ selector: { file_id: this.id } })
			.$.subscribe(docs => {
				if (!this.mutation_load_status) return (this.mutation_load_status = true)
				if (this.disable_watcher) return

				const add_doc = [] as Array<Note.Item>
				const remove_ids_map = $copy(this.ids_map)
				const target_ids_array = [] as Index['ids_array']
				const target_ids_map = new Map<string, undefined>()

				docs.forEach(doc => {
					const { id } = doc

					if (this.ids_map.has(id)) {
						remove_ids_map.delete(id)
					} else {
						add_doc.push(getDocItem(doc)!)
					}

					target_ids_array.push(id)
					target_ids_map.set(id, undefined)
				})

				if (remove_ids_map.size > 0) {
					Array.from(remove_ids_map.keys()).forEach(key => {
						this.editor.update(() => {
							const node = $getNodeByKey(key)

							if (node) node.remove()
						})
					})
				}

				if (add_doc.length) {
					add_doc.forEach(item => {
						const { prev, next, content } = item
						const json = JSON.parse(content)

						this.editor.update(() => {
							const node = $restoreNodeFromJson(json, this.editor._nodes)

							if (prev) {
								const prev_node = $getNodeByKey(prev)!

								prev_node.insertAfter(node)
							} else if (next) {
								const next_node = $getNodeByKey(next)!

								next_node.insertBefore(node)
							} else {
								$getRoot().append(node)
							}
						})
					})
				}

				if (remove_ids_map.size > 0 || add_doc.length) {
					this.ids_array = target_ids_array
					this.ids_map = target_ids_map

					this.addUpdateListner()
				}
			})
	}

	addUpdateListner() {
		this.removeUpdateListner()

		this.update_load_status = this.ids_array.length

		this.update_watchers = this.ids_array.map(key =>
			$db.collections[this.collection].findOne(key).$.subscribe(doc => {
				if (this.update_load_status !== 0) return this.update_load_status--
				if (this.disable_watcher) return

				const item = getDocItem(doc!)!
				const json = JSON.parse(item.content)
				const node_map = this.editor.getEditorState()._nodeMap
				const el = this.editor.getElementByKey(item.id)!

				this.editor.update(() => {
					const node = $getNodeByKey(item.id)!
					const selection = $getSelection()

					if ($isRangeSelection(selection)) {
						const match = $getMatchingParent(selection.focus.getNode(), n => node.is(n))

						if (match) {
							$setSelection(null)
						}
					}

					$restoreNodeFromJson(json, this.editor._nodes, node_map)

					el.classList.add('notice_text')

					setTimeout(() => {
						el.classList.remove('notice_text')
					}, 1500)
				})
			})
		)
	}

	removeUpdateListner() {
		this.update_watchers.forEach(item => item.unsubscribe())
		this.update_watchers = []
	}

	on() {
		this.addEditorListner()

		// 对接云端同步之后开放
		// this.addMutationListner()
		// this.addUpdateListner()
	}

	off() {
		this.unregister?.()
		this.removeUpdateListner()

		this.total_watcher?.unsubscribe?.()
		this.total_watcher = null as unknown as Subscription

		if (this.timer_change) {
			clearTimeout(this.timer_change)

			this.dispatch()
		}

		this.editor = null as unknown as LexicalEditor
	}
}
