import { ipc, is_electron } from '@/utils'

export const relaunch = () => {
	if (is_electron) {
		ipc.app.relaunch.query()
	} else {
		window.location.reload()
	}
}
