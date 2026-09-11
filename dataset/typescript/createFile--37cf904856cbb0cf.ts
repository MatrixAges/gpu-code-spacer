import { getDirTreeItem } from './data'

import type { DirTree } from '@/types'

export default async (module: DirTree.Item['module'], type: DirTree.Item['type']) => {
	$app.Event.emit(`${module}/dirtree/insert`, getDirTreeItem(module, type))
}
