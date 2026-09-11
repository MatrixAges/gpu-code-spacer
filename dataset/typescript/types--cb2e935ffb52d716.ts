import type Model from './model'
import type { IPropsCommon } from '@/Editor/types'

export interface IPropsTextBar extends IPropsCommon {
	only_text?: boolean
}

export type Format = 'bold' | 'italic' | 'strikethrough' | 'underline' | 'code' | 'link' | 'heading' | 'list'

export type Formats = Partial<Record<Format, boolean>>

export type ListType = 'bullet' | 'number' | 'check'

export interface IPropsFormats {
	md: boolean
	only_text: IPropsTextBar['only_text']
	formats: Model['formats']
	heading_type: Model['heading_type']
	list_type: Model['list_type']
	setRef: (v: HTMLElement) => void
	onFormat: Model['onFormat']
}
