import type Model from './model'

export interface IPropsViewer {
	mds: Model['mds']
	onChangeMd: Model['onChangeMd']
	onRemove: Model['onRemove']
}

export interface IPropsViewerItem {
	index: number
	content: Model['mds'][number]['content']
	onChangeMd: Model['onChangeMd']
}

export interface IPropsActions {
	save: Model['save']
}
