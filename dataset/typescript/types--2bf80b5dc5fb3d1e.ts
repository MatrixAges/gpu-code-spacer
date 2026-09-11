import type { MemoExoticComponent, RefObject } from 'react'
import type { PaginationProps } from 'antd'

export interface IProps {
	columns: Array<Column>
	dataSource: Array<any>
	rowKey?: string
	loading?: boolean
	stickyTop?: number
	scroller?: RefObject<HTMLDivElement>
	scrollX?: number
	pagination?: PaginationProps | false
	onChange: (index: number, v: any) => void
	onChangeSort?: (v: { field: string; order: 'desc' | 'asc' | null } | null) => void
	getRowClassName?: (item: any) => Array<string>
}

export interface Column {
	title: string
	dataIndex: string
	deps: Array<string>
	component: JSX.Element | MemoExoticComponent<any>
	width?: number
	align?: 'left' | 'center' | 'right'
	fixed?: 'left' | 'right'
	stickyOffset?: number
	sort?: boolean
	extra?: any
	alwaysEditing?: boolean
	disableEditing?: boolean
	resetEditing?: boolean
	useRowChange?: boolean
	getProps?: (...args: any) => any
	onAction?: (action: 'detail' | 'remove' | 'clean', deps: any, index: number) => void
}

export interface IPropsColGroup {
	columns: Array<Column>
}

export interface IPropsHeader extends Pick<IProps, 'columns' | 'stickyTop'> {
	scrollerX: HTMLDivElement
	scrollerY: HTMLDivElement
	left_shadow_index: number | null
	right_shadow_index: number | null
	sort: { field: string; order: 'desc' | 'asc' | null }
	changeSort: (field: string) => void
}

export interface IPropsTh {
	title: Column['title']
	dataIndex: Column['dataIndex']
	showSort: boolean
	sort: IPropsHeader['sort'] | undefined
	align: Column['align']
	fixed: Column['fixed']
	stickyOffset: Column['stickyOffset']
	shadow?: 'start' | 'end' | ''
	changeSort?: IPropsHeader['changeSort']
}

export interface IPropsRow extends Pick<IProps, 'columns' | 'onChange' | 'getRowClassName'> {
	item: any
	index: number
	left_shadow_index: number | null
	right_shadow_index: number | null
	sort: IPropsHeader['sort']
	editing_info: { row_index: number; field: string; focus: boolean } | undefined
	setEditingInfo: (v: IPropsRow['editing_info'] | null | undefined) => void
}

export interface IPropsColumn {
	value: any
	row_index: number
	dataIndex: string
	deps: any
	component: Column['component']
	align: Column['align']
	fixed: Column['fixed']
	extra: Column['extra']
	stickyOffset: Column['stickyOffset']
	alwaysEditing: Column['alwaysEditing']
	disableEditing: Column['disableEditing']
	focus: boolean
	shadow?: 'start' | 'end' | '' | false
	sorting?: boolean
	useRowChange?: Column['useRowChange']
	setEditingField: ((v: { field: string; focus: boolean } | null) => void) | undefined
	getProps: Column['getProps']
	onAction: Column['onAction']
	onRowChange?: (v: any) => void
}

export interface IPropsPagination extends PaginationProps {}

export interface Component<T = any, E = any> {
	value?: T
	row_index: number
	dataIndex: string
	deps: any
	extra: E
	editing: boolean
	onFocus?: (v?: any) => void
	onBlur?: () => void
	getProps?: Column['getProps']
	onAction?: Column['onAction']
	onChange?: (...args: any) => any
	onRowChange?: IPropsColumn['onRowChange']
}
