import { ipcLink } from 'electron-trpc/renderer'

import { createTRPCProxyClient } from '@trpc/client'

import type { Router } from '@electron/rpcs'

export default createTRPCProxyClient<Router>({
	// @ts-ignore
	links: globalThis.electronTRPC ? [ipcLink()] : []
})
