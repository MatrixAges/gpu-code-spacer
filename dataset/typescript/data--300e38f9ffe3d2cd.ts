import { id } from '@/utils'

import type { DirTree } from '@/types'

export const getDirTreeItem = (module: string, type: DirTree.Item['type']) => {
	if (type === 'file') {
		return {
			type: 'file',
			name: 'Sports',
			icon: ':bowling:',
			id: id(),
			module,
			pid: ''
		} as DirTree.Item
	} else {
		return {
			type: 'dir',
			name: 'Study',
			icon: ':blue_book:',
			id: id(),
			module,
			pid: ''
		} as DirTree.Item
	}
}
