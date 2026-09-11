import { createContext, useContext, useContextSelector } from '@openages/stk/react'

import type { App } from '@/types'

export interface StackContext {
	module: App.ModuleType
	id: string
	width: number
	container_width: number
	breakpoint?: 801 | 390
}

// @ts-ignore Avoid duplicate declarations
export const StackContext = createContext<StackContext>()

export const useStack = () => {
	return useContext(StackContext)
}

export const useStackSelector = <Selected>(selector: (value: StackContext) => Selected) => {
	return useContextSelector(StackContext, selector)
}
