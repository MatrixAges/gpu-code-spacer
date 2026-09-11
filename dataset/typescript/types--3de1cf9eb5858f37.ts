import type { GlobalModel } from '@/context/app'
import type Model from './model'
import type { DirTree } from '@/types'
import type { IPropsSearchInput, IPropsSearchResult } from '@/layout/types'

export interface IProps {
	id?: string
}

export interface IPropsBg {
	bg_index: Model['bg_index']
}

export interface IPropsApps {
	id: IProps['id']
	apps: GlobalModel['app']['apps']
}

export interface IPropsAppsItem {
	item: GlobalModel['app']['apps'][number]
}

export interface IPropsBgSelect {
	id: IProps['id']
	bg_index: Model['bg_index']
	setBgIndex: (v: Model['bg_index']) => void
}

export interface IPropsDrawer {
	id: IProps['id']
	drawer_type: Model['drawer_type']
	drawer_visible: Model['drawer_visible']
	module_type: Model['module_type']
	files_type: Model['files_type']
	files: GlobalModel['app']['star_files']
	setStar: GlobalModel['app']['setStar']
	onFile: (file: DirTree.Item) => void
	onStarFilesDragEnd: GlobalModel['app']['onStarFilesDragEnd']
	onClose: () => void
}

export interface IPropsSearch {
	props_input: Omit<IPropsSearchInput, 'search_ref'>
	props_result: Omit<IPropsSearchResult, 'text'>
}
