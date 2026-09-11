import dayjs from 'dayjs'
import { Workbook } from 'exceljs'
import { omit, pick } from 'lodash-es'
import { makeAutoObservable, runInAction } from 'mobx'
import { it } from 'node:test'
import scrollIntoView from 'smooth-scroll-into-view-if-needed'
import { match, P } from 'ts-pattern'
import { injectable } from 'tsyringe'

import { archive, cycle } from '@/actions/todo'
import { GlobalModel } from '@/context/app'
import { File, Loadmore, Utils } from '@/models'
import { getFileSetting } from '@/services'
import { downloadExcel, getDocItem, getDocItemsData, id, sleep } from '@/utils'
import { confirm } from '@/utils/antd'
import { disableWatcher, loading } from '@/utils/decorators'
import getEditorText from '@/utils/getEditorText'
import { arrayMove } from '@dnd-kit/sortable'
import { updateSort } from '@openages/stk/dnd'
import { setStorageWhenChange, useInstanceWatch } from '@openages/stk/mobx'

import { getTodo } from './initials'
import {
	archiveByTime,
	check,
	cleanTodoItem,
	create,
	getAnalysisData,
	getAngleTodoCounts,
	getMaxMinSort,
	getQueryItems,
	getTagTodoCounts,
	getTotalCounts,
	queryArchives,
	queryArchivesCounts,
	queryItem,
	recycle,
	removeAngle,
	removeTag,
	removeTodoItem,
	restoreArchiveItem,
	update,
	updateRelations,
	updateTodoSetting
} from './services'

import type { RxDB, Todo } from '@/types'
import type { Watch } from '@openages/stk/mobx'
import type { Dayjs } from 'dayjs'
import type { MangoQuerySelector, MangoQuerySortPart, RxDocument } from 'rxdb'
import type { Subscription } from 'rxjs'
import type {
	ArchiveQueryParams,
	ArgsCheck,
	ArgsInsert,
	ArgsMove,
	ArgsRemove,
	ArgsTab,
	ArgsUpdate,
	CurrentDetailIndex,
	CurrentDetailItem,
	Indexes,
	ItemsSortParams,
	KanbanItems,
	QuadItems,
	Mode,
	AnalysisDuration,
	AnalysisTrending
} from './types/model'
import type { ArgsUpdateTodoData } from './types/services'
import type { CleanTime } from '@/types'
@injectable()
export default class Index {
	id = ''
	mode = 'list' as Mode
	zen_mode = true
	timer_cycle: NodeJS.Timer | null = null
	timer_archive: NodeJS.Timer | null = null
	disable_watcher = false
	open_items = [] as Array<string>

	setting = {} as Todo.TodoSetting
	setting_watcher = null as Subscription | null
	items = [] as Array<Todo.TodoItem>
	items_watcher = null as Subscription | null
	kanban_items = {} as KanbanItems
	kanban_items_watcher = [] as Array<Subscription>
	quad_items = {} as QuadItems
	quad_items_watcher = [] as Array<Subscription>

	archives = [] as Array<Todo.Todo>
	archive_counts = 0
	archive_query_params = {} as ArchiveQueryParams

	items_sort_param = null as ItemsSortParams | null
	items_filter_tags = [] as Array<string>

	visible_settings_modal = false
	visible_archive_modal = false
	visible_detail_modal = false
	visible_table_filter = false
	visible_analysis_modal = false
	visible_activity_modal = false

	current_angle_id = ''
	current_detail_index = {} as CurrentDetailIndex

	table_pagination = { current: 1, pageSize: 15, total: 0 }
	table_selector = {} as MangoQuerySelector<Todo.TodoItem>
	table_sort = {} as MangoQuerySortPart<Todo.TodoItem>
	table_fields = {}

	analysis_duration = 'daily' as AnalysisDuration
	analysis_sort_params = [] as Array<ItemsSortParams>
	analysis_filter_angles = [] as Array<string>
	analysis_filter_tags = [] as Array<string>
	analysis_trending = null as AnalysisTrending | null
	analysis_items = [] as Array<Todo.Todo>

	search_id = ''

	watch = {
		['current_angle_id|items_sort_param|items_filter_tags']: () => {
			if (!this.id) return

			this.visible_detail_modal = false
			this.current_detail_index === ({} as CurrentDetailIndex)

			if (this.mode === 'list') {
				this.stopWatchItems()
				this.watchItems()
			}

			if (['kanban', 'flat', 'quad'].includes(this.mode)) {
				this.watchKanbanItems()
			}

			archive(this.id)
		},
		['setting.setting.angles']: v => {
			if (!this.id) return
			if (!this.setting.file_id) return

			const exist = v!.find(item => item.id === this.current_angle_id)

			if (!exist) {
				this.current_angle_id = v![0].id
			}
		},
		['visible_archive_modal']: v => {
			if (v) {
				this.queryArchives()
				this.queryArchivesCounts()
			} else {
				this.loadmore.page = 0
				this.loadmore.end = false
				this.archive_query_params = {}
			}
		},
		['loadmore.page']: v => {
			if (!v) return

			this.queryArchives()
		},
		['archive_query_params']: () => {
			if (!this.visible_archive_modal) return

			this.loadmore.page = 0
			this.loadmore.end = false

			this.queryArchives(true)
		},
		['mode']: v => {
			this.visible_detail_modal = false

			this.onModeChange(v!)
		}
	} as Watch<
		Index & {
			'current_angle_id|items_sort_param|items_filter_tags': any
			'setting.setting.angles': Todo.Setting['angles']
			'loadmore.page': number
		}
	>

	get is_filtered() {
		return Boolean(this.items_sort_param) || this.items_filter_tags.length > 0
	}

	get visible_angles() {
		const angles = this.setting?.setting?.angles || []
		const exclude_angles = this.setting?.setting?.exclude_angles || []

		return angles.filter(item => !exclude_angles.includes(item.id))
	}

	get current_detail_item() {
		if (!this.current_detail_index.id) return {} as CurrentDetailItem

		let items

		if (this.mode === 'kanban' || this.mode === 'flat' || this.mode === 'mindmap') {
			items = this.kanban_items[this.current_detail_index.dimension_id!]?.items
		} else if (this.mode === 'quad') {
			const target = this.getItem({
				index: this.current_detail_index.index,
				dimension_id: this.current_detail_index.dimension_id!
			})

			items = target.items
		} else {
			items = this.items
		}

		if (!items) return {} as CurrentDetailItem

		const target_index = items.findIndex(item => item.id === this.current_detail_index.id)

		if (!items[target_index]) return {} as CurrentDetailItem

		return {
			item: $copy(items[target_index]),
			prev_id: target_index - 1 >= 0 ? items.at(target_index - 1)?.id : undefined,
			next_id: items.at(target_index + 1)?.id
		} as CurrentDetailItem
	}

	constructor(
		public global: GlobalModel,
		public utils: Utils,
		public file: File,
		public loadmore: Loadmore
	) {
		makeAutoObservable(
			this,
			{
				global: false,
				utils: false,
				file: false,
				loadmore: false,
				id: false,
				timer_cycle: false,
				timer_archive: false,
				disable_watcher: false,
				setting_watcher: false,
				items_watcher: false,
				kanban_items_watcher: false,
				quad_items_watcher: false,
				watch: false
			},
			{ autoBind: true }
		)
	}

	onModeChange(v: Mode) {
		match(v)
			.with(P.union('list', 'table'), () => {
				this.watchItems()
			})
			.with(P.union('kanban', 'flat', 'mindmap'), () => {
				this.watchKanbanItems()
			})
			.with('quad', () => {
				this.watchQuadItems()
			})
			.exhaustive()

		if (!['list', 'table'].includes(v)) {
			this.items = []
			this.stopWatchItems()
		}

		if (!['kanban', 'flat', 'mindmap'].includes(v)) {
			this.kanban_items = {}
			this.stopWatchKanbanItems()
		}

		if (v !== 'quad') {
			this.stopWatchQuadItems()
		}

		if (v !== 'table') {
			this.table_pagination = { current: 1, pageSize: 15, total: 0 }
			this.table_selector = {}
			this.table_sort = {}
		}
	}

	async init(args: { id: string }) {
		const { id } = args

		this.utils.acts = [...useInstanceWatch(this)]
		this.id = id

		const disposer_local = setStorageWhenChange([{ [`${id}_mode`]: 'mode' }], this)

		const disposer_session = setStorageWhenChange([{ [`${id}_open_items`]: 'open_items' }], this, {
			useSession: true
		})

		this.file.init(this.id)

		this.on()

		await this.watchSetting()

		if (this.mode === 'list' || this.mode === 'table') {
			if (this.items_watcher) return
			if (this.mode === 'list' && !this.current_angle_id) return

			this.watchItems()
		} else {
			if (this.kanban_items_watcher.length) return

			this.watchKanbanItems()
		}

		this.utils.acts.push(disposer_local, disposer_session)
	}

	async queryArchives(reset?: boolean) {
		const items = (await queryArchives(
			{ file_id: this.id, page: this.loadmore.page },
			this.archive_query_params
		)) as RxDB.ItemsDoc<Todo.TodoItem>

		if (items.length === 0) {
			this.loadmore.end = true

			if (reset) {
				this.archives = []
			} else {
				return
			}
		}

		const data = getDocItemsData(items) as Array<Todo.Todo>

		if (this.loadmore.page === 0) {
			this.archives = data
		} else {
			this.archives = this.archives.concat(data)
		}
	}

	async queryArchivesCounts() {
		this.archive_counts = await queryArchivesCounts(this.id)
	}

	async updateSetting(changed_values: ArgsUpdateTodoData['changed_values'], values?: ArgsUpdateTodoData['values']) {
		await updateTodoSetting({
			file_id: this.id,
			setting: this.setting,
			changed_values,
			values: values ?? { ...$copy(this.setting?.setting), ...$copy(this.file.data) },
			setTodo: setting => {
				this.setting = setting
			}
		})

		if ('angles' in changed_values && this.mode === 'flat') {
			this.kanban_items = {}

			this.watchKanbanItems()
		}

		if ('exclude_angles' in changed_values) {
			if (this.mode === 'list' && changed_values['exclude_angles']?.includes(this.current_angle_id)) {
				this.current_angle_id = this.visible_angles[0].id
			}

			this.onModeChange(this.mode)
		}
	}

	@loading
	async create(item: Todo.TodoItem, options?: { quick?: boolean; dimension_id?: string; top?: boolean }) {
		const data = {} as Todo.TodoItem

		if (this.mode === 'kanban' || this.mode === 'flat' || this.mode === 'mindmap') {
			data['angle_id'] = options?.dimension_id!
		} else if (this.mode === 'quad') {
			data['angle_id'] = this.current_angle_id || this.visible_angles[0].id
			;(data as Todo.Todo)['level'] = Number(options?.dimension_id!.replace('level_', ''))
		} else {
			data['angle_id'] = this.current_angle_id
		}

		const res = await create({ ...item, ...data, file_id: this.id } as Todo.TodoItem, {
			quick: options?.quick,
			top: options?.top
		})

		if (!options?.quick) await sleep(900)

		return res
	}

	async check(args: ArgsCheck) {
		const { index, dimension_id, status } = args

		const { item } = this.getItem({ index, dimension_id })

		this.setItem(item, { status })

		await check({
			file_id: this.id,
			setting: this.setting.setting,
			id: item!.id,
			status
		})

		const todo_item = (await queryItem(item!.id)) as RxDocument<Todo.Todo>

		if (status === 'checked' || status === 'closed') {
			if (this.setting.setting.auto_archiving === '0m') {
				await archive(this.id)
			}

			if (todo_item.remind_time) {
				await todo_item.updateCRDT({ ifMatch: { $unset: { remind_time: '' } } })
			}

			recycle(todo_item)
		} else {
			if (todo_item.cycle_enabled && todo_item.cycle && todo_item.cycle.value !== undefined) {
				await todo_item.updateCRDT({ ifMatch: { $unset: { recycle_time: '', archive_time: '' } } })
			}
		}
	}

	async update(args: ArgsUpdate) {
		const { type, value, index, children_index, dimension_id } = args

		const { item } = this.getItem({ index, dimension_id })

		if (!item) return

		let data = type === 'parent' ? { id: item!.id, ...value } : { id: item!.id, children: value }

		if (type === 'close') {
			return this.check({ index, dimension_id, status: 'closed' })
		}

		if (type === 'unclose') {
			return this.check({ index, dimension_id, status: 'unchecked' })
		}

		if (type === 'archive') {
			return archive(this.id, item!.id)
		}

		if (type === 'children' && !(value?.length! > 0)) {
			data['children'] = undefined
		}

		if (type === 'children_item') {
			const children = $copy(item!.children)

			if (!children?.[children_index!]) return

			children[children_index!] = { ...children[children_index!], ...value }

			data['children'] = children
		}

		if (type === 'insert_children_item') {
			const children = [...($copy(item!.children) || [])]
			const target = { id: id(), text: '', status: 'unchecked' } as const

			if (children_index === undefined) {
				children.push(target)
			} else {
				children.splice(children_index + 1, 0, target)
			}

			data['children'] = children

			this.setItem(item, data)

			if (document.activeElement) (document.activeElement as HTMLDivElement).blur()

			await update(data)

			setTimeout(
				() => {
					const el = document.getElementById(
						`${this.visible_detail_modal ? 'detail_' : ''}todo_${target.id}`
					)

					if (el) {
						;(el.querySelector('.__editor_root') as HTMLDivElement)?.focus()
					}
				},
				this.mode === 'mindmap' ? 60 : 0
			)

			return
		}

		if (type === 'remove_children_item') {
			const children = [...($copy(item!.children) || [])]

			children.splice(children_index!, 1)

			data['children'] = children
		}

		this.setItem(item, data)

		await update(data)
	}

	async updateRelations(active_id: string, over_id: string, dimension_id?: string) {
		await updateRelations({
			file_id: this.id,
			setting: this.setting,
			items: this.getItem({ dimension_id }).items as Array<Todo.Todo>,
			active_id,
			over_id
		})
	}

	async move(args: ArgsMove) {
		const { active, over } = args
		const { index: active_index, dimension_id: active_dimension_id } = active
		const { index: over_index, dimension_id: over_dimension_id } = over

		if (!active_dimension_id) {
			const items = arrayMove($copy(this.items), active_index!, over_index!)

			const { item, sort } = updateSort(items, over_index!)

			this.items = items

			await update({ id: item.id, sort })
		} else {
			if (active_dimension_id === over_dimension_id) {
				const items = arrayMove(
					$copy(this.kanban_items[active_dimension_id].items),
					active_index!,
					over_index!
				)

				const { item, sort } = updateSort(items, over_index!)

				this.kanban_items[active_dimension_id].items = items

				await update({ id: item.id, sort })
			} else {
				if (this.isLinked(this.kanban_items[active_dimension_id].items[active_index!].id)) return

				const [active_item] = this.kanban_items[active_dimension_id].items.splice(active_index!, 1)

				this.kanban_items[over_dimension_id!].items.splice(over_index! + 1, 0, active_item)

				const { sort } = updateSort(this.kanban_items[over_dimension_id!].items, over_index! + 1)

				await update({ id: active_item.id, angle_id: over_dimension_id, sort })
			}
		}
	}

	async removeAngle(angle_id: string) {
		const counts = await getAngleTodoCounts(this.id, angle_id)

		if (counts > 0) {
			const res = await confirm({
				id: this.id,
				title: $t('common.notice'),
				// @ts-ignore
				content: $t('common.angles.remove_confirm', { counts })
			})

			if (!res) return false
		}

		await removeAngle(this.id, angle_id)

		return true
	}

	async removeTag(tag_id: string) {
		const counts = await getTagTodoCounts(this.id, tag_id)

		if (counts > 0) {
			const res = await confirm({
				id: this.id,
				title: $t('common.notice'),
				// @ts-ignore
				content: $t('common.tags.remove_confirm', { counts })
			})

			if (!res) return false
		}

		await removeTag(this.id, tag_id)

		return true
	}

	@disableWatcher
	async insert(args: ArgsInsert) {
		if (this.is_filtered) return

		const { index, dimension_id, data, callback } = args
		const fields = data ?? (getTodo() as Todo.TodoItem)

		const item = await this.create(fields, { quick: true, dimension_id })

		const { items } = this.getItem({ index, dimension_id })

		runInAction(() => {
			if (index === -1) {
				items.push(item as Todo.TodoItem)

				this.kanban_items = $copy(this.kanban_items)
			} else {
				items.splice(index! + 1, 0, item as Todo.TodoItem)
			}

			if (callback) callback()
		})

		if (!data) {
			if (document.activeElement) (document.activeElement as HTMLDivElement).blur()

			setTimeout(
				() => {
					const el = document.getElementById(`todo_${item!.id}`)

					if (el) {
						;(el.querySelector('.__editor_root') as HTMLDivElement)?.focus()
					}
				},
				this.mode === 'mindmap' ? 60 : 0
			)
		}

		if (index !== -1) {
			const { sort } = updateSort(items, index! + 1)

			await update({ id: item!.id, sort })
		}
	}

	@disableWatcher
	async tab(args: ArgsTab) {
		if (this.is_filtered) return

		const { type, index, dimension_id } = args
		const { items, item } = this.getItem({ index, dimension_id })

		if (type === 'in') {
			const prev_item = items[index! - 1]

			if (!prev_item || prev_item.type === 'group') return

			const exsit_index = this.setting.setting.relations
				? this.setting.setting.relations.findIndex(
						relation =>
							relation.items.includes(item!.id) || relation.items.includes(prev_item.id)
					)
				: -1

			if (exsit_index !== -1) return
			if (item!.children?.length) return

			const data = {
				...pick(item, ['id', 'text']),
				status: 'unchecked'
			} as Required<Todo.Todo>['children'][number]

			const children = prev_item.children ? [...prev_item.children, data] : [data]

			await this.remove({
				index,
				dimension_id,
				id: item!.id,
				callback() {
					prev_item.children = children
				}
			})

			await update({ id: prev_item.id, children: $copy(children) })
		} else {
			const children_index = args.children_index
			const data = item!.children![children_index]
			const target_item = {
				...getTodo(),
				text: data.text,
				angle_id: item!.angle_id,
				status: 'unchecked'
			} as Todo.Todo

			await this.insert({
				index,
				dimension_id,
				data: target_item,
				callback() {
					item!.children!.splice(children_index, 1)

					if (!item!.children!.length) {
						item!.children = undefined
					}
				}
			})

			await update({ id: item!.id, children: $copy(item!.children) })
		}
	}

	async moveTo(todo_id: string, angle_id: string) {
		if (this.isLinked(todo_id)) return

		const sort = await getMaxMinSort(angle_id)

		await update({ id: todo_id, angle_id, sort: sort + 1 })
	}

	async remove(args: ArgsRemove) {
		const { index, dimension_id, id, callback } = args

		const { items } = this.getItem({ index, dimension_id })

		runInAction(() => {
			items.splice(index!, 1)

			if (callback) callback()
		})

		await removeTodoItem(id)
	}

	async clean(id: string) {
		cleanTodoItem(id)
	}

	async restoreArchiveItem(id: string) {
		const todo_item = (await queryItem(id))!

		if (todo_item.recycle_time) {
			await todo_item.updateCRDT({ ifMatch: { $set: { recycle_time: undefined } } })
		}

		await restoreArchiveItem(id, this.setting.setting.angles, this.setting.setting.tags, this.current_angle_id)

		this.updateArchiveItems(id)
	}

	async removeArchiveItem(id: string) {
		await removeTodoItem(id)

		this.updateArchiveItems(id)
	}

	async archiveByTime(v: CleanTime) {
		const res = await archiveByTime(this.id, v)

		if (!res) return

		this.loadmore.page = 0
		this.loadmore.end = false

		await this.queryArchives(true)
	}

	async cycleByTime() {
		if (!this.id) return

		await cycle(this.id)
	}

	async redirect(id: string) {
		const target = (await $db.todo_items.findOne(id).exec())!

		if (target.archive) {
			this.table_selector = { id }
			this.mode = 'table'
		} else {
			this.mode = 'list'
			this.current_angle_id = target.angle_id

			setTimeout(() => {
				const target_dom = document.getElementById(target.id)!
				const target_todo = document.getElementById(`todo_${target.id}`)!

				scrollIntoView(target_dom, { block: 'center', behavior: 'smooth' })

				target_todo.classList.add('notice_text')

				setTimeout(() => {
					target_todo.classList.remove('notice_text')
				}, 1200)
			}, 300)
		}
	}

	async getAnalysisData() {
		const { trending, items } = await getAnalysisData({
			file_id: this.id,
			analysis_duration: this.analysis_duration,
			analysis_sort_params: this.analysis_sort_params,
			analysis_filter_angles: this.analysis_filter_angles,
			analysis_filter_tags: this.analysis_filter_tags
		})

		this.analysis_trending = trending
		this.analysis_items = items
	}

	async exportToExcel() {
		if (!this.items.length) return

		const angles = this.setting?.setting?.angles || []
		const tags = this.setting?.setting?.tags || []

		const target_items = (
			$copy(this.items) as Array<
				Todo.Todo & { status_text: string; angle: string; tags: string; create: string; done: string }
			>
		).map(item => {
			const target_angle = angles.find(it => it.id === item.angle_id)!
			const target_tags = tags.filter(it => (item.tag_ids || []).includes(it.id))

			item.status_text = $t(`todo.common.status.${item.status}`)
			item.angle = target_angle?.text || ''
			item.text = item.text ? getEditorText(item.text) : ''
			item.tags = target_tags.map(it => it.text).join(' ')
			item.create = dayjs(item.create_at).format('YYYY-MM-DD HH:mm')
			item.done = item.done_time ? dayjs(item.done_time).format('YYYY-MM-DD HH:mm') : ''

			return pick(item, 'status_text', 'angle', 'text', 'tags', 'create', 'done')
		})

		const workbook = new Workbook()
		const worksheet = workbook.addWorksheet($t('modules.todo'))

		const headers = Object.keys(target_items[0]).map(item => {
			if (item === 'status_text') return $t('todo.common.status.label')
			if (item === 'angle') return $t('todo.Archive.filter.angle')
			if (item === 'text') return $t('todo.common.text')
			if (item === 'tags') return $t('todo.Header.options.tags')
			if (item === 'create') return $t('todo.Header.options.sort.create_at')
			if (item === 'done') return $t('todo.common.done_time')
		})

		worksheet.addRow(headers)

		worksheet.addRows(
			target_items.map(item => {
				return Object.values(item)
			})
		)

		headers.forEach((_, index) => {
			const column = index + 1

			let width = 12

			if (column === 3) width = 45
			if (column === 4) width = 15
			if (column === 5 || column === 6) width = 15

			worksheet.getColumn(column).width = width
		})

		const buffer = await workbook.xlsx.writeBuffer()

		downloadExcel(this.file.data.name, buffer)
	}

	handleOpenItem(id: string, v: boolean) {
		if (v) {
			if (this.open_items.includes(id)) return

			this.open_items.push(id)

			this.open_items = $copy(this.open_items)
		} else {
			if (!this.open_items.includes(id)) return

			this.open_items = $copy(this.open_items.filter(item => item !== id))
		}
	}

	onTableRowChange(index: number, values: Partial<Todo.Todo>) {
		const { item } = this.getItem({ index })

		const key = Object.keys(values)[0] as keyof Partial<Todo.Todo>
		const value = values[key]

		if (key === 'status') {
			return this.check({ index, status: value as Todo.Todo['status'] })
		}

		if (key === 'archive') {
			return this.restoreArchiveItem(item!.id)
		}

		this.update({ type: 'parent', index, value: values })
	}

	onTableSortChange(v: { field: string; order: 'asc' | 'desc' | null } | null) {
		this.table_sort = v?.order ? { [v.field]: v.order } : {}
		this.table_pagination = { ...this.table_pagination, current: 1 }

		this.stopWatchItems()
		this.watchItems()
	}

	onTablePageChange(page: number, pageSize: number) {
		if (pageSize !== this.table_pagination.pageSize) {
			this.table_pagination.current = 1
		} else {
			this.table_pagination.current = page
		}

		this.table_pagination.pageSize = pageSize

		this.stopWatchItems()
		this.watchItems()
	}

	onTableSearch(values: any) {
		this.table_pagination = { current: 1, pageSize: this.table_pagination.pageSize, total: 0 }

		const selector = {} as MangoQuerySelector<Todo.TodoItem>

		if (values.status) {
			selector['status'] = values.status
		}

		if (values.text) {
			selector['text'] = { $regex: `.*${values.text}.*`, $options: 'i' }
		}

		if (values.angle_id) {
			selector['angle_id'] = values.angle_id
		}

		if (values.tag_id) {
			selector['tag_ids'] = { $elemMatch: { $in: [values['tag_id']] } }
		}

		if (values.level) {
			selector['level'] = values.level
		}

		if (values.remind_time) {
			selector['remind_time'] = {
				$exists: true,
				$ne: undefined,
				$lte: (values.remind_time as Dayjs).valueOf()
			}
		}

		if (values.end_time) {
			selector['end_time'] = {
				$exists: true,
				$ne: undefined,
				$lte: (values.end_time as Dayjs).valueOf()
			}
		}

		if (values.cycle_enabled) {
			if (values.cycle_enabled === 'enabled') {
				selector['cycle_enabled'] = true
			} else {
				selector['$or'] = [
					{ cycle_enabled: { $exists: false } },
					{ cycle_enabled: { $eq: undefined } },
					{ cycle_enabled: { $eq: false } }
				]
			}
		}

		if (values.schedule) {
			if (values.schedule === 'yes') {
				selector['schedule'] = true
			} else {
				selector['$or'] = [
					{ schedule: { $exists: false } },
					{ schedule: { $eq: undefined } },
					{ schedule: { $eq: false } }
				]
			}
		}

		if (values.archive) {
			if (values.archive === 'yes') {
				selector['archive'] = true
			} else {
				selector['$or'] = [
					{ archive: { $exists: false } },
					{ archive: { $eq: undefined } },
					{ archive: { $eq: false } }
				]
			}
		}

		if (values.create_at) {
			selector['create_at'] = {
				$lte: (values.create_at as Dayjs).valueOf()
			}
		}

		this.table_selector = selector

		this.stopWatchItems()
		this.watchItems()
	}

	resetSearchMode() {
		this.table_selector = {}

		this.stopWatchItems()
		this.watchItems()
	}

	isLinked(id: string) {
		const relations = this.setting.setting?.relations || []

		return relations.findIndex(item => item.items.includes(id)) !== -1
	}

	getItem(args: Indexes) {
		const { index, dimension_id } = args

		const items = match(dimension_id)
			.with(
				P.when(v => v && v?.indexOf('level_') !== -1),
				() => this.quad_items[dimension_id!]
			)
			.with(
				P.when(v => v !== undefined),
				() => this.kanban_items[dimension_id!].items
			)
			.otherwise(() => this.items)

		return { items, item: index === undefined ? null : (items[index] as Todo.Todo) }
	}

	setItem(item: any, data: any) {
		Object.keys(omit(data, 'id')).forEach(key => {
			item[key] = data[key]
		})
	}

	setMode(v: Index['mode']) {
		this.mode = v

		if (v === 'mindmap' || v === 'table') {
			this.items_sort_param = null
			this.items_filter_tags = []
		}
	}

	updateArchiveItems(id: string) {
		this.archives.splice(
			this.archives.findIndex(item => item.id === id),
			1
		)
		this.archive_counts = this.archive_counts - 1
	}

	checkCurrentDetailIndex() {
		if (!this.visible_detail_modal) return
		if (!this.current_detail_index.id) return

		const target_index = this.items.findIndex(item => item.id === this.current_detail_index.id)

		if (this.current_detail_index.index !== target_index) {
			this.current_detail_index.index = target_index
		}
	}

	getVisibleDetailModal() {
		return this.visible_detail_modal
	}

	watchSetting() {
		const { promise, resolve } = Promise.withResolvers()

		this.setting_watcher = getFileSetting(this.id).$.subscribe(setting => {
			if (!setting) return

			const todo_setting = getDocItem(setting)!

			this.setting = { ...omit(todo_setting, 'setting'), setting: JSON.parse(todo_setting.setting) }

			resolve()

			if (this.current_angle_id) return

			this.current_angle_id = this.visible_angles[0].id
		})

		return promise
	}

	watchItems() {
		this.stopWatchItems()

		this.items = []

		if (this.mode === 'list') {
			const current_angle_id = this.current_angle_id

			this.items_watcher = getQueryItems({
				file_id: this.id,
				angle_id: this.current_angle_id,
				items_sort_param: this.items_sort_param,
				items_filter_tags: this.items_filter_tags
			}).$.subscribe(docs => {
				if (this.disable_watcher) return
				if (!current_angle_id) return

				this.items = getDocItemsData(docs)

				this.checkCurrentDetailIndex()
			})
		}

		if (this.mode === 'table') {
			getTotalCounts({ file_id: this.id, ...$copy(this.table_selector) }).then(
				res => (this.table_pagination.total = res)
			)

			this.items_watcher = getQueryItems({
				file_id: this.id,
				selector: this.table_selector,
				sort: this.table_sort,
				table_mode: true,
				table_page: this.table_pagination.current,
				table_pagesize: this.table_pagination.pageSize
			}).$.subscribe(docs => {
				this.items = getDocItemsData(docs)

				this.checkCurrentDetailIndex()
			})
		}
	}

	watchKanbanItems() {
		this.stopWatchKanbanItems()

		if (!this.setting.setting) return

		const angles = this.visible_angles

		this.kanban_items_watcher = angles.map(item => {
			this.kanban_items[item.id] = {
				dimension: { type: 'angle', value: item },
				items: [] as Array<Todo.Todo>,
				loaded: false
			}

			return getQueryItems({
				file_id: this.id,
				selector: { type: 'todo' },
				angle_id: item.id,
				items_sort_param: this.items_sort_param,
				items_filter_tags: this.items_filter_tags
			}).$.subscribe(items => {
				if (this.disable_watcher) return

				this.kanban_items[item.id].items = getDocItemsData(items) as Array<Todo.Todo>
				this.kanban_items[item.id].loaded = true
			})
		})
	}

	watchQuadItems() {
		this.stopWatchQuadItems()

		const levels = [4, 3, 2, 1]

		this.quad_items_watcher = levels.map(level => {
			const key = `level_${level}`

			this.quad_items[key] = [] as Array<Todo.Todo>

			return getQueryItems({
				file_id: this.id,
				selector: { type: 'todo', level },
				items_sort_param: this.items_sort_param,
				items_filter_tags: this.items_filter_tags
			}).$.subscribe(items => {
				if (this.disable_watcher) return

				this.quad_items[key] = getDocItemsData(items) as Array<Todo.Todo>
			})
		})
	}

	stopWatchItems() {
		if (this.items_watcher) this.items_watcher.unsubscribe()
	}

	stopWatchKanbanItems() {
		this.kanban_items = {}

		if (!this.kanban_items_watcher.length) return

		this.kanban_items_watcher.forEach(item => item.unsubscribe())

		this.kanban_items_watcher = []
	}

	stopWatchQuadItems() {
		this.quad_items = {}

		if (!this.quad_items_watcher.length) return

		this.quad_items_watcher.forEach(item => item.unsubscribe())

		this.quad_items_watcher = []
	}

	on() {
		this.timer_cycle = setInterval(this.cycleByTime, 30 * 1000)
		this.timer_archive = setInterval(() => archive(this.id), 60 * 1000)

		window.$app.Event.on(`todo/${this.id}/redirect`, this.redirect)
		window.$app.Event.on(`todo/${this.id}/getVisibleDetailModal`, this.getVisibleDetailModal)
	}

	off() {
		this.utils.off()
		this.file.off()

		this.setting_watcher?.unsubscribe?.()
		this.setting_watcher = null

		this.items_watcher?.unsubscribe?.()
		this.items_watcher = null

		this.kanban_items_watcher.forEach(item => item?.unsubscribe?.())
		this.kanban_items_watcher = []

		clearInterval(this.timer_cycle!)
		clearInterval(this.timer_archive!)

		window.$app.Event.off(`todo/${this.id}/redirect`, this.redirect)
		window.$app.Event.off(`todo/${this.id}/getVisibleDetailModal`, this.getVisibleDetailModal)
	}
}
