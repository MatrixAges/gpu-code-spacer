import en from 'antd/locale/en_US'
import { useEffect, useState } from 'react'

import type { Lang } from '@/appdata'

export default (lang: Lang) => {
	const [locale, setLocale] = useState(en)

	useEffect(() => {
		import(`@/locales/antd/${lang}`).then(l => setLocale(l.default))
	}, [lang])

	return locale
}
