import type Option from './option'
import type Model from './model'

export interface IProps {
	text_mode?: boolean
	linebreak?: boolean
}

export interface IPropsMenu {
	all_options: Array<Option>
	latest_blocks: Model['latest_blocks']
	options: Array<Option>
	selected_index: number
	text_mode: IProps['text_mode']
	selectOptionAndCleanUp: (option: Option) => void
	setHighlightedIndex: (index: number) => void
}

export interface IPropsMenuLatest {
	blocks: Array<Option>
	selectOptionAndCleanUp: IPropsMenu['selectOptionAndCleanUp']
}

export interface IPropsItem {
	option: Option
	index: number
	selected: boolean
	selectOptionAndCleanUp: IPropsMenu['selectOptionAndCleanUp']
	setHighlightedIndex: IPropsMenu['setHighlightedIndex']
}
