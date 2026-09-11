import type Model from './model'

export interface IPropsModuleTab {
	module: Model['module']
	onChangeModule: (v: Model['module']) => void
}

export interface IPropsFiles {
	module: Model['module']
	latest_files: Model['latest_files']
	search_mode: Model['search_mode']
	onItem: Model['onItem']
}
export interface IPropsFileItem {
	module: Model['module']
	item: Model['latest_files'][number]
	index: number
	onItem: Model['onItem']
}

export interface IPropsItems {
	module: Model['module']
	latest_items: Model['latest_items']
	search_mode: Model['search_mode']
	onItem: Model['onItem']
}

export interface IPropsItem {
	module: Model['module']
	item: Model['latest_items'][number]
	index: number
	onItem: Model['onItem']
}
