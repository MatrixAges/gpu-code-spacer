import type { ModalProps, ModalFuncProps } from 'antd'

interface Args {
	id?: string
	title: string
	content: string
	zIndex?: number
	footer?: ModalProps['footer']
	props?: ModalFuncProps
}

export const confirm = async ({ id, title, content, zIndex, footer, props }: Args) => {
	return new Promise(resolve => {
		$modal.confirm({
			title,
			content,
			centered: true,
			zIndex,
			footer,
			...props,
			getContainer: () => (id ? document.getElementById(id) : document.body)!,
			onOk() {
				resolve(true)
			},
			onCancel() {
				resolve(false)
			}
		})
	})
}

export const info = async ({ id, title, content, zIndex, footer, props }: Args) => {
	return new Promise(resolve => {
		$modal.info({
			title,
			content,
			centered: true,
			zIndex,
			footer,
			...props,
			getContainer: () => (id ? document.getElementById(id) : document.body)!,
			onOk() {
				resolve(true)
			}
		})
	})
}
