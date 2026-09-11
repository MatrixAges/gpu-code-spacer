import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { Router } from '@electron/rpcs'

export namespace Ipc {
	export type Input = inferRouterInputs<Router>
	export type Output = inferRouterOutputs<Router>
}
