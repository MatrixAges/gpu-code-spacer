import { diff } from 'deep-object-diff'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { setElements } from '@/utils'
import { deepEqual } from '@openages/stk/react'

import { getNodeEdge, layout } from './utils'

import type { Node, Edge, GeneralHelpers, FitView } from '@xyflow/react'
import type { IPropsMindmap } from '@/modules/todo/types'

@injectable()
export default class Index {
	args = {} as Pick<IPropsMindmap, 'file_id' | 'name' | 'kanban_items'>
	pure_nodes = [] as Array<Node>
	prev_layout_nodes = [] as Array<Node>
	nodes = [] as Array<Node>
	edges = [] as Array<Edge>
	signal = false

	shadow_handlers = {} as {
		setNodes: GeneralHelpers['setNodes']
	}

	graph_handlers = {} as {
		fitView: FitView
		setNodes: GeneralHelpers['setNodes']
		setEdges: GeneralHelpers['setEdges']
	}

	constructor() {
		makeAutoObservable(
			this,
			{
				args: false,
				pure_nodes: false,
				prev_layout_nodes: false,
				nodes: false,
				edges: false,
				shadow_handlers: false,
				graph_handlers: false
			},
			{ autoBind: true }
		)
	}

	init(args: Index['args']) {
		this.args = args

		this.getNodeEdge()
	}

	getNodeEdge(kanban_items?: IPropsMindmap['kanban_items']) {
		if (deepEqual(kanban_items, this.args.kanban_items)) return

		if (kanban_items) this.args = { ...this.args, kanban_items }

		const { nodes, edges } = getNodeEdge(this.args)

		if (this.nodes.length) {
			this.setNodes(nodes, true)
			this.setEdges(edges)
		}

		this.pure_nodes = nodes
		this.edges = edges
		this.signal = !this.signal
	}

	layout(v: Array<Node>) {
		if (deepEqual(this.prev_layout_nodes, v)) return

		const new_nodes = $copy(v)
		const nodes = layout(this.args, new_nodes)

		if (this.nodes.length) {
			this.setNodes(nodes)

			this.nodes = nodes
		} else {
			this.nodes = nodes
		}

		this.prev_layout_nodes = v
		this.signal = !this.signal
	}

	setNodes(new_nodes: Array<Node>, shadow?: boolean) {
		const { setNodes } = shadow ? this.shadow_handlers : this.graph_handlers
		const prev_nodes = shadow ? this.pure_nodes : this.nodes

		setElements(prev_nodes, new_nodes, setNodes)
	}

	setEdges(new_edges: Array<Edge>) {
		const { setEdges } = this.graph_handlers

		setElements(this.edges, new_edges, setEdges)
	}
}
