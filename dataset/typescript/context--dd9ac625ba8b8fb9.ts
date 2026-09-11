import { createContext, useContextSelector } from '@openages/stk/react'

import type { IPropsMindmap } from '@/modules/todo/types'

export interface IPropsContext
	extends Pick<
		IPropsMindmap,
		| 'file_id'
		| 'tags'
		| 'angles'
		| 'check'
		| 'insert'
		| 'update'
		| 'tab'
		| 'moveTo'
		| 'remove'
		| 'showDetailModal'
	> {}

// @ts-ignore Avoid duplicate declarations
export const Context = createContext<IPropsContext>()

export const useContext = <Selected>(selector: (value: IPropsContext) => Selected) => {
	return useContextSelector(Context, selector)
}
