import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default () => {
	const { t, i18n } = useTranslation()

	return useMemo(
		() => [
			{ label: t('common.clean.options.1week'), value: '1week' },
			{ label: t('common.clean.options.15days'), value: '15days' },
			{ label: t('common.clean.options.1month'), value: '1month' },
			{ label: t('common.clean.options.3month'), value: '3month' },
			{ label: t('common.clean.options.6month'), value: '6month' },
			{ label: t('common.clean.options.1year'), value: '1year' }
		],
		[i18n.language]
	)
}
