import { useEventListener, useMemoizedFn } from 'ahooks'

export default () => {
	const errorHandler = useMemoizedFn((e: any) => {
		if (
			e.message.includes(
				'ResizeObserver loop completed with undelivered notifications' ||
					'ResizeObserver loop limit exceeded'
			)
		) {
			const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay')
			if (resizeObserverErr) {
				resizeObserverErr.style.display = 'none'
			}
		}
	})

	useEventListener('error', errorHandler)
}
