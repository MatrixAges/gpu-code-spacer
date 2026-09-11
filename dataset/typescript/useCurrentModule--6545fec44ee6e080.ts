import { minimatch } from 'minimatch'
import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router-dom'

import { modules } from '@/appdata'

import type { App } from '@/types'

export default () => {
	const { pathname } = useLocation()

	return useMemo(() => {
		let target_index = null as number | null

		modules.map((item, index) => {
			if (matchPath(item.path, pathname) || minimatch(pathname, `${item.path}/*`)) {
				target_index = index
			}
		})

		return modules[target_index || 0].title
	}, [pathname]) as App.ModuleType
}
