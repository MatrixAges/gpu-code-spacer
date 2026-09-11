import { App } from 'antd'

import { useMountEffect } from '@/hooks'

export default () => {
	const staticFunction = App.useApp()

	useMountEffect(() => {
		$message = staticFunction.message
		$modal = staticFunction.modal
		$notification = staticFunction.notification
	}, [staticFunction])
}
