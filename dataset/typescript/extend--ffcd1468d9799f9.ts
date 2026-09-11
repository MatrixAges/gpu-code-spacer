import { DirTree as _DirTree } from './schema/dirtree_items'

export namespace Extend {
	export namespace DirTree {
		export type TransformedItem = _DirTree.Item & { children?: Array<TransformedItem> }
		export type TransformedItems = Array<TransformedItem>
	}
}
