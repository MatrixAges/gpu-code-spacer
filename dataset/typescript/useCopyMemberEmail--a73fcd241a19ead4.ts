import { useMemoizedFn } from 'ahooks'
import { useTranslation } from 'react-i18next'

export default () => {
	const { t } = useTranslation()

	const copy = useMemoizedFn(async () => {
		await window.navigator.clipboard.writeText('if.member@openages.com')

		$message.success('if.member@openages.com ' + t('common.copied'))
	})

	return { copy }
}
