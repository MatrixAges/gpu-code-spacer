import lz from 'lz-string'

import { local } from '@openages/stk/storage'

import type { Trpc } from '@/types'

export const getUserData = () => {
	const local_user = local.user

	return local_user ? (JSON.parse(lz.decompress(local_user)) as Trpc.UserData) : null
}

export const goLogin = () => {
	local.removeItem('user')
	local.removeItem('token')

	$message.warning($t('app.auth.not_login'))

	$app.Event.emit('global.auth.resetUser')
	$app.Event.emit('global.setting.goLogin')

	return false
}
