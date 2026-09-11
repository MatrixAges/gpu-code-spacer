import { useEffect, useState } from 'react'

const match_media = window.matchMedia('(prefers-color-scheme: dark)')

const setBodyAttr = (v: 'light' | 'dark') => {
	document.documentElement.setAttribute('data-theme', v)
	document.documentElement.style.colorScheme = v
}

export default (set_body_attr?: boolean) => {
	const [theme, setTheme] = useState<'light' | 'dark'>(() => {
		const v = match_media.matches ? 'dark' : 'light'

		if (set_body_attr) setBodyAttr(v)

		return v
	})

	useEffect(() => {
		const onThemeChange: MediaQueryList['onchange'] = event => {
			const v = event.matches ? 'dark' : 'light'

			setTheme(v)

			if (set_body_attr) setBodyAttr(v)
		}

		match_media.addEventListener('change', onThemeChange)

		return () => match_media.removeEventListener('change', onThemeChange)
	}, [set_body_attr])

	return theme
}
