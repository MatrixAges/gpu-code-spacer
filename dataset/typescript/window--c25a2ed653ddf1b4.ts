import cx from 'classix'
import rfdc from 'rfdc'

import Emittery from '@openages/stk/emittery'
import { handle, memo } from '@openages/stk/react'

import type { MessageInstance } from 'antd/es/message/interface'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm'
import type { NotificationInstance } from 'antd/es/notification/interface'

window.$is_dev = process.env.NODE_ENV === 'development'

window.$app = {
	// @ts-ignore
	memo,
	handle,
	Event: new Emittery()
}

window.$t = (() => {}) as any
window.$copy = rfdc({ proto: true })
window.$cx = cx
window.$navigate = (() => {}) as any

window.$stack_offs = new Map()

window.$message = {} as MessageInstance
window.$notification = {} as NotificationInstance
window.$modal = {} as Omit<ModalStaticFunctions, 'warn'>

window.__key__ = () => 'I16DKS#hY+Two0O'
