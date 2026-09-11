import type { Node as NodeType } from '@openages/stk/graph'

const Index = (
	tree: NodeType,
	nodes_map: Record<string, { width: number; height: number; position: { x: number; y: number } }>
) => {
	nodes_map[tree.id].position = { x: tree.x!, y: tree.y! }

	if (tree.children) tree.children.forEach(item => Index(item, nodes_map))
}

export default Index
