import PQueue from 'p-queue'

import { observable } from '@trpc/server/observable'

import { goLogin } from './auth'

import type { Router } from '@server/rpcs'
import type { Operation, TRPCLink } from '@trpc/client'

const queue = new PQueue({ concurrency: 1 })

export type Args = {
	tokenRefreshNeeded: (op: Operation) => true | unknown
	fetchAccessToken: (op: Operation) => Promise<unknown>
}

export default <AppRouter extends Router>(args: Args): TRPCLink<AppRouter> => {
	const { tokenRefreshNeeded, fetchAccessToken } = args

	return () => {
		return ({ next, op }) => {
			return observable(observer => {
				void queue.add(async () => {
					const refresh = tokenRefreshNeeded(op)

					if (refresh === true) {
						const res = await fetchAccessToken(op)

						if (res === false) return queue.clear()
					}

					if (refresh === false) {
						return queue.clear()
					}

					next(op).subscribe({
						error(error) {
							if (error.data?.code === 'UNAUTHORIZED') {
								goLogin()
							}

							observer.error(error)
						},
						next(value) {
							observer.next(value)
						},
						complete() {
							observer.complete()
						}
					})
				})
			})
		}
	}
}
