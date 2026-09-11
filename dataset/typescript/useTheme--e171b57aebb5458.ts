import { useMemo } from 'react'

import { getAntdTheme } from '@/theme'

import type { Theme } from '@/appdata'

export default (theme: Theme, color_main: string) => {
	return useMemo(() => getAntdTheme(theme, color_main), [theme, color_main])
}
