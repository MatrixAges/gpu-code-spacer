import { Decimal } from 'decimal.js'
import { debounce, omit } from 'lodash-es'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { mini_app_icon } from '@/appdata'
import Utils from '@/models/utils'
import { arrayMove } from '@dnd-kit/sortable'
import { setStorageWhenChange, useInstanceWatch } from '@openages/stk/mobx'

import type { DirTree, Stack, App } from '@/types'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Watch } from '@openages/stk/mobx'

@injectable()
export default class Index {
	observer = null as unknown as ResizeObserver
	columns = [] as Stack.Columns
	focus = { column: -1, view: -1 } as Stack.Position
	container_width = 0
	resizing = false

	watch = {
		columns: v => {
			if (v!.length) return

			this.focus = { column: -1, view: -1 }
		}
	} as Watch<Index>

	constructor(public utils: Utils) {
		makeAutoObservable(this, { utils: false, observer: false, watch: false }, { autoBind: true })
	}

	init() {
		this.utils.acts = [setStorageWhenChange(['columns', 'focus'], this), ...useInstanceWatch(this)]

		this.getObserver()

		this.on()
	}

	find(id: string) {
		for (let column_index = 0; column_index < this.columns.length; column_index++) {
			const column = this.columns[column_index]

			for (let view_index = 0; view_index < column.views.length; view_index++) {
				const view = column.views[view_index]

				if (view.id === id) {
					return { view, column_index, view_index }
				}
			}
		}

		return {}
	}

	add(view: Stack.View) {
		$app.Event.emit('global.app.setLatest', view.id)

		const exsit_view = this.find(view.id)

		if (exsit_view?.view) {
			this.columns[exsit_view.column_index].views.forEach(item => (item.active = false))

			exsit_view.view.active = true

			this.focus = { column: exsit_view.column_index, view: exsit_view.view_index }

			return this.updateColumnsFocus()
		}

		if (this.focus.column === -1) {
			this.columns = [{ views: [view], width: 100 }]
			this.focus = { column: 0, view: 0 }

			return
		}

		const target_views = this.columns[this.focus.column]?.views

		if (!target_views) {
			this.focus = { column: -1, view: -1 }

			return
		}

		const last_view = target_views.at(-1)

		if (!last_view || last_view?.fixed) {
			if (view.top) {
				target_views.unshift(view)
			} else {
				target_views.push(view)
			}
		} else {
			target_views.splice(target_views.length - 1, 1, view)
		}

		target_views.forEach(item => (item.active = false))

		if (view.top) {
			target_views[0].active = true
		} else {
			target_views[target_views.length - 1].active = true
		}

		this.focus.view = target_views.length - 1

		this.updateColumnsFocus()
	}

	remove(position: Stack.Position) {
		const { column, view } = position
		const target_views = this.columns[column].views
		const target_view = target_views[view]
		const target_view_id = target_view.id

		this.handleStackOffs(target_view_id)

		if (target_view.module === 'pomo') {
			$app.Event.emit(`pomo/${target_view.file.id}/stopRecord`)
		}

		target_views.splice(view, 1)

		if (!target_views.length) {
			const [remove_column] = this.columns.splice(column, 1)

			if (this.focus.column === column && this.focus.view === view) {
				let target_column = this.columns[this.columns.length - 1]

				if (!target_column) {
					this.focus = { column: -1, view: -1 }
				} else {
					this.focus.column = this.columns.length - 1
					this.focus.view = target_column.views.length - 1
				}
			}

			if (this.columns.length) {
				const is_width_euqal = this.columns.every(item => item.width === this.columns[0].width)

				if (is_width_euqal) {
					const width = new Decimal(Decimal.div(100, this.columns.length).toFixed(2)).toNumber()

					this.columns.forEach(item => (item.width = width))
				} else {
					if (this.columns.at(column - 1)) {
						this.columns[column - 1].width += remove_column.width
					}

					if (this.columns.at(column)) {
						this.columns[column].width += remove_column.width
					}
				}
			}

			this.updateColumnsFocus()

			return
		}

		const exsit_active = target_views.some(item => item.active)

		if (!exsit_active) {
			target_views[target_views.length - 1].active = true
		}

		if (this.focus.column === column && this.focus.view === view) {
			this.focus.view = target_views.length - 1
		}

		this.updateColumnsFocus()
	}

	click(position: Stack.Position, ignore_columns?: boolean) {
		const { column, view } = position
		const target_views = this.columns[column].views

		if (!target_views[view].active) {
			target_views.forEach(item => (item.active = false))

			target_views[view].active = true
		}

		this.focus = position

		if (!ignore_columns) {
			this.updateColumnsFocus()
		}
	}

	update({ position, v }: { position: Stack.Position; v: Partial<Stack.View> }) {
		this.columns[position.column].views[position.view] = {
			...this.columns[position.column].views[position.view],
			...v
		}

		this.updateColumnsFocus()
	}

	updateFile(v: DirTree.Item) {
		const exsit_view = this.find(v.id)

		if (!exsit_view?.view) return

		this.columns[exsit_view.column_index].views[exsit_view.view_index].file = {
			...$copy(this.columns[exsit_view.column_index].views[exsit_view.view_index].file),
			...omit(v, 'id')
		}

		this.updateColumnsFocus()
	}

	removeFile(id: string) {
		const exsit_view = this.find(id)

		if (!exsit_view?.view) return

		this.remove({ column: exsit_view.column_index, view: exsit_view.view_index })
	}

	move({ active, over }: Pick<DragEndEvent, 'active' | 'over'>) {
		if (!over?.id) return false
		if (active.data.current!.type !== 'stack' || over.data.current!.type !== 'stack') return

		const active_column = active.data.current!.column as number
		const active_view = active.data.current!.view as number

		if (!this.columns[active_column].views[active_view].fixed) {
			this.columns[active_column].views[active_view].fixed = true

			this.columns = $copy(this.columns)
		}

		if (active.id === over.id) return

		const over_column = over.data.current!.column as number
		const over_view = over.data.current!.view as number
		const split = over.data.current!.split as boolean

		if (!split) {
			if (active_column === over_column) {
				const target_views = this.columns[active_column].views
				const active_item = target_views[active_view]
				const over_item = target_views[over_view]

				if (!over_item) return

				if (!active_item.fixed) {
					active_item.fixed = true
				}

				if (!over_item.fixed) {
					over_item.fixed = true
				}

				this.columns[active_column].views = arrayMove(
					$copy(this.columns[active_column].views),
					active_view,
					over_view
				)

				this.focus.view = over_view
			} else {
				const target = $copy(this.columns[active_column].views[active_view])

				this.columns[over_column].views.push(target)

				const target_views = this.columns[over_column].views

				target_views.forEach(item => (item.active = false))

				target_views[target_views.length - 1].active = true

				this.remove({ column: active_column, view: active_view })

				this.focus = { column: over_column, view: target_views.length - 1 }
			}
		} else {
			if (this.columns[active_column].views.length === 1) return

			const direction = over.data.current!.direction as 'left' | 'right'
			const target_column = this.columns[active_column]
			const target_views = [$copy(target_column.views[active_view])]

			const width = new Decimal(Decimal.div(100, this.columns.length + 1).toFixed(2)).toNumber()

			const target_index = direction === 'left' ? over_column : over_column + 1

			this.remove({ column: active_column, view: active_view })

			this.columns.splice(target_index, 0, {
				views: target_views,
				width
			} as Stack.Column)

			this.columns.forEach(item => (item.width = width))

			this.focus = { column: target_index, view: 0 }
		}

		this.updateColumnsFocus()
	}

	resize(column: number, width: number) {
		const percent = new Decimal(Decimal.div(width, this.container_width).mul(100).toFixed(2)).toNumber()
		const total = this.columns[column].width + this.columns[column - 1].width

		this.columns[column].width = percent
		this.columns[column - 1].width = Decimal.sub(total, percent).toNumber()

		this.columns = $copy(this.columns)
	}

	addMiniApp(args: { module: App.MiniAppType; top: boolean }) {
		const { module, top } = args
		const id = `__${module}__`

		this.add({
			id,
			module,
			file: { id, icon: mini_app_icon[module], name: $t(`modules.${module}`) } as DirTree.Item,
			active: true,
			fixed: true,
			top
		})
	}

	handleStackOffs(id: string) {
		const target_offs = $stack_offs.get(id)

		if (target_offs) target_offs.forEach(item => item())
	}

	removeStackOffs() {
		if (!this.columns.length) return

		this.columns.forEach(column => {
			column.views.forEach(view => {
				if (view.active) {
					$stack_offs.delete(view.id)
				}
			})
		})
	}

	updateColumnsFocus() {
		this.columns = $copy(this.columns)
		this.focus = $copy(this.focus)

		this.removeStackOffs()
	}

	getObserver() {
		this.observer = new ResizeObserver(
			debounce(elements => {
				if (!elements.length) return

				const width = elements[0].contentRect.width

				if (this.container_width === width) return

				this.container_width = width
			}, 450)
		)
	}

	observe() {
		this.observer.observe(document.getElementById('stacks_container')!)
	}

	unobserve() {
		this.observer?.disconnect()
	}

	on() {
		$app.Event.on('global.stack.find', this.find)
		$app.Event.on('global.stack.add', this.add)
		$app.Event.on('global.stack.addMiniApp', this.addMiniApp)
		$app.Event.on('global.stack.updateFile', this.updateFile)
		$app.Event.on('global.stack.removeFile', this.removeFile)
	}

	off() {
		this.observer?.disconnect()
		this.utils.off()

		$app.Event.off('global.stack.find', this.find)
		$app.Event.off('global.stack.add', this.add)
		$app.Event.off('global.stack.addMiniApp', this.addMiniApp)
		$app.Event.off('global.stack.updateFile', this.updateFile)
		$app.Event.off('global.stack.removeFile', this.removeFile)
	}
}
