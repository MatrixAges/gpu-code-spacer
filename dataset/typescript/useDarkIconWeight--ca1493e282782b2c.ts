import { useMemo } from 'react'

import { useGlobal } from '@/context/app'

export default () => {
	const global = useGlobal()

	return useMemo(() => (global.setting.theme === 'light' ? 'duotone' : 'regular'), [global.setting.theme])
}
