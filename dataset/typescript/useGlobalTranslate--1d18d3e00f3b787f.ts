import { useTranslation } from 'react-i18next'

import { useMountEffect } from '@/hooks'

export default () => {
	const { t, i18n } = useTranslation()

	useMountEffect(() => {
		$t = t
	}, [t, i18n.language])
}
