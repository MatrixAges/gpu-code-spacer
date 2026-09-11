import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode } from '@lexical/rich-text'

import CodeNode from './plugins/Code/CodeNode'
import CodeTextNode from './plugins/Code/CodeTextNode'
import DividerNode from './plugins/Divider/Node'
import ImageNode from './plugins/Image/Node'
import KatexNode from './plugins/Katex/Node'
import MermaidNode from './plugins/Mermaid/Node'
import NavigationNode from './plugins/Navigation/Node'
import QuoteNode from './plugins/Quote/QuoteNode'
import RefNode from './plugins/Ref/Node'
import TableCellNode from './plugins/Table/TableCellNode'
import TableNode from './plugins/Table/TableNode'
import TableRowNode from './plugins/Table/TableRowNode'
import ToggleBodyNode from './plugins/Toggle/ToggleBodyNode'
import ToggleBtnNode from './plugins/Toggle/ToggleBtnNode'
import ToggleHeadNode from './plugins/Toggle/ToggleHeadNode'
import ToggleNode from './plugins/Toggle/ToggleNode'

import type { Klass, LexicalNode, LexicalNodeReplacement } from 'lexical'

export const note_nodes = [
	ImageNode,
	KatexNode,
	MermaidNode,
	DividerNode,
	CodeNode,
	CodeTextNode,
	ToggleNode,
	ToggleBtnNode,
	ToggleHeadNode,
	ToggleBodyNode,
	TableNode,
	TableRowNode,
	TableCellNode,
	QuoteNode,
	NavigationNode,
	RefNode,

	AutoLinkNode,
	LinkNode,
	HeadingNode,
	ListNode,
	ListItemNode
] as ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>

export const text_nodes = [
	RefNode,

	AutoLinkNode,
	LinkNode,
	HeadingNode,
	ListNode,
	ListItemNode
] as ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>
