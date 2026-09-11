import type { Auth } from '@/models'
import type { Trpc } from '@/types'
import type { FC } from 'react'

export interface IPropsSign {
	sign_type: Auth['sign_type']
	loading: Record<string, boolean>
	signin: Auth['signin']
	signup: Auth['signup']
	sendVerifyCode: Auth['sendVerifyCode']
}

export interface IPropsBtnSend {
	loading: boolean
	sendVCode: () => Promise<false | unknown>
}

export interface IPropsUser {
	user: Auth['user']
	temp_user: Auth['temp_user']
	edit_mode: Auth['edit_mode']
	updateTempUser: (v: Partial<Trpc.UserData>) => void
	signout: Auth['signout']
	activate: Auth['activate']
	shutdown: Auth['shutdown']
}
