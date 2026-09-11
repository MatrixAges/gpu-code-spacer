import type Model from './model'
import type { GlobalModel } from '@/context/app'

export interface IPropsShadow {
	pure_nodes: Model['pure_nodes']
	layout: Model['layout']
	setHandlers: (v: Model['shadow_handlers']) => void
}

export interface IPropsGraph {
	theme: GlobalModel['setting']['theme']
	nodes: Model['nodes']
	edges: Model['edges']
	setHandlers: (v: Model['graph_handlers']) => void
}
