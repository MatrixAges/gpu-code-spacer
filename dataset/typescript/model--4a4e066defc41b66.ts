import { $getNodeByKey, COMMAND_PRIORITY_LOW } from 'lexical'
import { debounce, throttle } from 'lodash-es'
import { makeAutoObservable, runInAction } from 'mobx'
import smoothScrollIntoView from 'smooth-scroll-into-view-if-needed'

import { CHANGE_EDITOR_SETTINGS, INSERT_NAVIGATION_COMMAND } from '@/Editor/commands'
import { $getHeadingLevel, insertBlock } from '@/Editor/utils'
import { getComputedStyleValue } from '@/utils'
import { mergeRegister } from '@lexical/utils'

import { $createNavigationNode } from './utils'

import type { LexicalEditor } from 'lexical'
import type NavigationNode from './Node'
import type { CSSProperties } from 'react'

import type { TableOfContentsEntry } from '@lexical/react/LexicalTableOfContentsPlugin'
import type { HeadingNode } from '@lexical/rich-text'
import type { Note, ArgsKV } from '@/types'

export default class Index {
	id = ''
	editor = null as unknown as LexicalEditor
	page_width = ''
	container = null as unknown as HTMLElement
	ref = null as unknown as HTMLElement
	observer = null as unknown as ResizeObserver
	items = [] as Array<TableOfContentsEntry>
	toc = 'default' as Note.Setting['toc']

	visible_mini_nav = false
	minimize = false
	scroll = false
	style = null as unknown as CSSProperties
	visible_items = [] as Array<string>
	active_items = [] as Array<string>

	unregister = null as unknown as () => void

	constructor() {
		makeAutoObservable(
			this,
			{
				id: false,
				editor: false,
				page_width: false,
				container: false,
				ref: false,
				observer: false,
				items: false,
				onScroll: false,
				unregister: false
			},
			{ autoBind: true }
		)

		this.onScroll = debounce(this.onScroll.bind(this), 120)
	}

	init(id: Index['id'], editor: Index['editor'], page_width: Index['page_width']) {
		this.id = id
		this.editor = editor
		this.page_width = page_width
		this.container = document.getElementById(this.id)!

		this.on()
		this.getPosition()
	}

	getPosition() {
		const editor_container = document.querySelector(`#${this.id} .__editor_container`)!

		const { top, right: right_container, width, height } = this.container.getBoundingClientRect()
		const { right: right_editor_container } = editor_container.getBoundingClientRect()

		if (this.page_width === '100%' || width < 1110 || this.toc === 'minimize') {
			this.minimize = true

			this.style = { left: right_container - 24 - 18 }

			return
		}

		if (width >= 1420) {
			this.style = { left: right_editor_container + 150, top, width: 180, height }
		} else {
			this.style = { left: right_container - 150 - 48, top, height }
		}

		this.minimize = false
		this.visible_mini_nav = false
	}

	onScroll() {
		if (!this.items.length) return

		this.editor.update(() => {
			let target_top = null as unknown as number
			let target_index: number
			let list_max_level = 6

			const visible_items = [] as Array<string>
			const active_items = [] as Array<string>

			const { height } = this.container.getBoundingClientRect()

			this.items.forEach(([node_key], index) => {
				const el = this.editor.getElementByKey(node_key)

				if (!el) return

				const { top } = el.getBoundingClientRect()
				const level = $getHeadingLevel($getNodeByKey(node_key)!)

				if (level < list_max_level) {
					list_max_level = level
				}

				if (target_top === null) {
					target_top = top
					target_index = index
				}

				if (top - (getComputedStyleValue(el, 'line-height') + height / 2) <= 0) {
					if (top > target_top) {
						target_top = top
						target_index = index
					}
				} else {
					if (top < target_top) {
						target_top = top
						target_index = index
					}
				}
			})

			const prev_items = this.items.slice(0, target_index!)
			const next_items = this.items.slice(target_index!)
			const target_key = this.items[target_index!][0]
			const target_node = $getNodeByKey(target_key) as HeadingNode
			const target_level = $getHeadingLevel(target_node)

			visible_items.push(target_node.getKey())
			active_items.push(target_node.getKey())

			let current_max_level = target_level
			let current_prev_index = prev_items.length - 1
			let has_prev_max_level = false

			while (current_prev_index >= 0 && prev_items[current_prev_index]) {
				const current_node: HeadingNode = $getNodeByKey(prev_items[current_prev_index][0])!
				const current_key = current_node.getKey()
				const current_level = $getHeadingLevel(current_node)

				if (
					current_level > current_max_level ||
					(current_level === list_max_level && has_prev_max_level)
				) {
					break
				}

				if (current_level <= current_max_level) {
					visible_items.push(current_key)

					if (current_level < current_max_level) {
						active_items.push(current_key)

						current_max_level = current_level
					}
				}

				if (current_level === list_max_level) {
					has_prev_max_level = true
				}

				current_prev_index--
			}

			let current_min_level = target_level
			let current_next_index = 0
			let has_next_max_level = false

			while (current_next_index < next_items.length && next_items[current_next_index]) {
				const current_node: HeadingNode = $getNodeByKey(next_items[current_next_index][0])!
				const current_key = current_node.getKey()
				const current_level = $getHeadingLevel(current_node)

				if (
					current_level < current_min_level ||
					(current_level === list_max_level && has_next_max_level)
				) {
					break
				}

				if (current_level >= current_min_level) {
					visible_items.push(current_key)

					if (current_level > current_max_level) {
						current_min_level = current_level
					}
				}

				if (current_level === list_max_level) {
					has_next_max_level = true
				}

				current_next_index++
			}

			let scroll = false

			if (this.ref) {
				const nav_is_scroll = this.ref.scrollHeight > this.ref.clientHeight

				if (nav_is_scroll) {
					smoothScrollIntoView(this.ref.querySelector(`.nav_item_${target_key}`)!, {
						scrollMode: 'if-needed',
						boundary: this.ref
					})

					scroll = true
				} else {
					scroll = false
				}
			}

			runInAction(() => {
				this.scroll = scroll
				this.visible_items = visible_items
				this.active_items = active_items
			})
		})
	}

	insert() {
		const node = $createNavigationNode() as NavigationNode

		insertBlock(node)

		return true
	}

	updateToc(args: ArgsKV<Index['toc']>) {
		if (args.key !== 'toc') return

		this.toc = args.value

		if (args.value === 'hidden') {
			this.removeEventListener()
		} else {
			this.addEventListener()
		}

		this.getPosition()

		return false
	}

	addEventListener() {
		this.removeEventListener()

		this.container.addEventListener('scroll', this.onScroll)
	}

	removeEventListener() {
		this.container.removeEventListener('scroll', this.onScroll)
	}

	on() {
		this.unregister = mergeRegister(
			this.editor.registerCommand(INSERT_NAVIGATION_COMMAND, this.insert, COMMAND_PRIORITY_LOW),
			this.editor.registerCommand(CHANGE_EDITOR_SETTINGS, this.updateToc, COMMAND_PRIORITY_LOW)
		)

		this.addEventListener()

		this.observer = new ResizeObserver(throttle(this.getPosition.bind(this), 30))

		this.observer.observe(this.container)
	}

	off() {
		this.unregister()
		this.removeEventListener()

		this.observer.unobserve(this.container)
		this.observer.disconnect()
	}
}
