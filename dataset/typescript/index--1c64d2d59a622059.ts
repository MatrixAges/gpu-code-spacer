import type { Pomo } from '@/types'

import type Model from '../model'

export interface IProps {
	id: string
}

export interface IPropsSession {
	data: Model['data']
	item: Pomo.Session
	is_dark_theme: boolean
	should_show_current: boolean
	name: Model['file']['data']['name']
	view_direction: Model['view_direction']
	changeViewIndex: Model['changeViewIndex']
}

export interface IPropsSessionEditor {
	item?: Pomo.Session
	onChange: (v: Pomo.Session) => void
	close?: () => void
}

export interface IPropsActions {
	going: Model['data']['going']
	continuous_mode: Model['data']['continuous_mode']
	flow_mode: boolean
	add: Model['add']
	toggleGoing: Model['toggleGoing']
	next: Model['next']
	toggleContinuousMode: Model['toggleContinuousMode']
	toggleEditModal: () => void
}

export interface IPropsIndicators {
	view_index: Model['view_index']
	index: Model['data']['index']
	counts: number
	changeViewIndex: Model['changeViewIndex']
}

export interface IPropsSessionsEditModal {
	visible_edit_modal: Model['visible_edit_modal']
	data: Model['data']
	update: Model['update']
	remove: Model['remove']
	move: Model['move']
	close: () => void
}

export interface IPropsSessionsEditModalItem {
	item: Pomo.Session
	index: number
	disabled: boolean
	timeline?: { current: Pomo.Item['current']; time: number }
	update: Model['update']
	remove: Model['remove']
}
