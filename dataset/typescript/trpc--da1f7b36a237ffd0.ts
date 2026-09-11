import to from 'await-to-js'
import dayjs from 'dayjs'
import { jwtDecode } from 'jwt-decode'
import lz from 'lz-string'
import { RecognizedBrowser } from 'sniffr'

import { local } from '@openages/stk/storage'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

import { goLogin } from './auth'
import { BASE_URL } from './env'
import getJson from './getJson'
import hono from './hono'
import { request } from './ofetch'
import trpcRefreshTokenLink from './trpcRefreshTokenLink'

import type { Router } from '@server/rpcs'

const ignore_paths = ['auth.sendVerifyCode', 'auth.signup', 'auth.signin']

const trpc = createTRPCProxyClient<Router>({
	links: [
		trpcRefreshTokenLink({
			tokenRefreshNeeded(op) {
				if (ignore_paths.includes(op.path)) return

				if (!local.token) return goLogin()

				const exp = jwtDecode(local.token).exp! * 1000
				const now = Date.now()
				const left_time = dayjs(exp).diff(now, 'minute')

				if (exp > now && left_time <= 90) return true

				if (exp <= now) return true

				return
			},
			async fetchAccessToken() {
				const compressed_user = local.user

				if (!compressed_user) return goLogin()

				const user = JSON.parse(lz.decompress(compressed_user))

				const [err_raw, res_raw] = await to(
					hono.refreshToken.$post({
						json: {
							mid: local.mid,
							id: user.id,
							token: local.token,
							refresh_token: user.refresh_token,
							platform: RecognizedBrowser.os.name as 'macos' | 'windows'
						}
					})
				)

				if (err_raw) return

				const res = await getJson(res_raw)

				if (res.error) {
					$message.error(res?.error)

					return goLogin()
				}

				const { data } = res

				if (typeof data === 'string') {
					local.token = data
				} else {
					local.token = data.token
					local.user = lz.compress(JSON.stringify({ ...user, refresh_token: data.refresh_token }))
				}
			}
		}),
		httpBatchLink({
			url: BASE_URL + '/trpc',
			async headers() {
				return local.token ? { Authorization: `Bearer ${local.token}` } : {}
			},
			async fetch(input, options) {
				// @ts-ignore
				return request.raw(input as string, options)
			}
		})
	]
})

export default trpc
