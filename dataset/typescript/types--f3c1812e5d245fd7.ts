import type { GlobalModel } from '@/context/app'
import type { App, DirTree } from '@/types'
import type { RefObject } from 'react'

export interface IPropsSidebar {
	current_module: App.ModuleType
	blur: GlobalModel['layout']['blur']
	theme: GlobalModel['setting']['theme']
	show_bar_title: GlobalModel['setting']['show_bar_title']
	apps: GlobalModel['app']['apps']
	showSetting: () => void
}

export interface IPropsSidebarItem {
	current_module: App.ModuleType
	theme: GlobalModel['setting']['theme']
	show_bar_title: GlobalModel['setting']['show_bar_title']
	item: App.Module
	active: boolean
}

export interface IPropsStacks {
	columns: GlobalModel['stack']['columns']
	focus: GlobalModel['stack']['focus']
	container_width: GlobalModel['stack']['container_width']
	resizing: GlobalModel['stack']['resizing']
	click: GlobalModel['stack']['click']
	remove: GlobalModel['stack']['remove']
	update: GlobalModel['stack']['update']
	move: GlobalModel['stack']['move']
	resize: GlobalModel['stack']['resize']
	setResizing: (v: boolean) => boolean
	observe: GlobalModel['stack']['observe']
	unobserve: GlobalModel['stack']['unobserve']
	showHomeDrawer: () => void
}

export interface IPropsStacksNavBar
	extends Omit<
		IPropsStacks,
		| 'visible'
		| 'current_module'
		| 'container_width'
		| 'move'
		| 'resize'
		| 'setResizing'
		| 'observe'
		| 'unobserve'
		| 'showSetting'
	> {
	resizing: boolean
}

export interface IPropsStacksNavBarColumn extends Omit<IPropsStacksNavBar, 'columns' | 'move'> {
	column_index: number
	show_homepage_btn?: boolean
	column_is_last?: boolean
	column: IPropsStacksNavBar['columns'][number]
}

export interface IPropsStacksNavBarView
	extends Omit<IPropsStacksNavBarColumn, 'column' | 'move' | 'resizing' | 'showHomeDrawer'> {
	view_index: number
	view: IPropsStacksNavBar['columns'][number]['views'][number]
	drag_overlay?: boolean
}

export interface IPropsStacksContent
	extends Pick<IPropsStacks, 'columns' | 'container_width' | 'click' | 'resize' | 'setResizing'> {
	resizing: boolean
}

export interface IPropsStacksContentDrop {
	column_index: number
	direction: 'left' | 'right'
}

export interface IPropsStacksContentColumn {
	column_index: number
	column: IPropsStacksNavBar['columns'][number]
	width: number
	container_width: IPropsStacksContent['container_width']
	resizing: IPropsStacksContent['resizing']
	click: IPropsStacksContent['click']
	resize: IPropsStacksContent['resize']
	setResizing: IPropsStacksContent['setResizing']
}

export interface IPropsStacksContentView {
	column_index: number
	view_index: number
	view: IPropsStacksNavBar['columns'][number]['views'][number]
	width: number
	container_width: IPropsStacksContent['container_width']
	click: IPropsStacksContent['click']
}

export interface IPropsStacksView {
	column_index: number
	view_index: number
	module: App.ModuleType
	id: string
	width: number
	container_width: IPropsStacksContent['container_width']
	click: IPropsStacksContent['click']
}

export interface IPropsSearch {
	current_module: App.ModuleType
	open: GlobalModel['search']['open']
	module: GlobalModel['search']['module']
	items: GlobalModel['search']['items']
	index: GlobalModel['search']['index']
	history: GlobalModel['search']['history']
	setModule: (v: IPropsSearch['module']) => void
	searchByInput: GlobalModel['search']['searchByInput']
	onClose: GlobalModel['search']['closeSearch']
	onCheck: GlobalModel['search']['onCheck']
	changeSearchIndex: (index: number) => void
	clearSearchHistory: () => void
}

export interface IPropsSearchInputRef {
	text: string
	input: HTMLInputElement
	setText: (v: string) => void
}

export interface IPropsSearchInput {
	className?: string
	search_ref: RefObject<IPropsSearchInputRef>
	module: GlobalModel['search']['module']
	items: GlobalModel['search']['items']
	index: GlobalModel['search']['index']
	setModule: (v: IPropsSearch['module']) => void
	searchByInput: GlobalModel['search']['searchByInput']
	onClose: GlobalModel['search']['closeSearch']
	onCheck: GlobalModel['search']['onCheck']
	changeSearchIndex: (index: number) => void
	clearSearchHistory: () => void
	showResult?: () => void
}

export interface IPropsSearchResult {
	module: GlobalModel['search']['module']
	items: GlobalModel['search']['items']
	index: GlobalModel['search']['index']
	text: string
	onCheck: GlobalModel['search']['onCheck']
	changeSearchIndex: (index: number) => void
	hideResult?: () => void
}

export interface IPropsSetting {
	visible: GlobalModel['setting']['visible']
	onClose: () => void
}

export interface IPropsHomeDrawer {
	tab: GlobalModel['app']['homepage_tab']
	active: GlobalModel['app']['homepage_active']
	latest_files: GlobalModel['app']['latest_files']
	star_files: GlobalModel['app']['star_files']
	setTab: (v: IPropsHomeDrawer['tab']) => void
	setActive: (v: IPropsHomeDrawer['active']) => void
	showSetting: () => void
	closeHome: () => void
	setStar: GlobalModel['app']['setStar']
	onFile: (file: DirTree.Item) => void
	onStarFilesDragEnd: GlobalModel['app']['onStarFilesDragEnd']
}

export interface IPropsHomeDrawerHeader
	extends Pick<IPropsHomeDrawer, 'tab' | 'setTab' | 'showSetting' | 'closeHome'> {}

export interface IPropsHomeDrawerFiles
	extends Pick<IPropsHomeDrawer, 'tab' | 'setStar' | 'onFile' | 'onStarFilesDragEnd'> {
	files: DirTree.Items
}

export interface IPropsHomeDrawerFilesItem extends Pick<IPropsHomeDrawerFiles, 'tab' | 'setStar' | 'onFile'> {
	item: DirTree.Item
}

export interface IPropsHomeDrawerApps {
	active: App.ModuleType
	setActive: (v: IPropsHomeDrawerApps['active']) => void
}

export interface IPropsHomeDrawerDirtree {
	active: App.ModuleType
}
