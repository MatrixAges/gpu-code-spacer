import { hc } from 'hono/client'

import { BASE_URL } from './env'
import { request } from './ofetch'

import type { Api } from '@server/apis'
import type { FetchOptions, FetchResponse } from 'ofetch'

type ExcludedFetchOptions<ExtraTypes = Record<string, unknown>> = Omit<
	FetchOptions,
	'method' | 'body' | 'responseType'
> &
	ExtraTypes

type Requester<C = Record<string, never>> = <TResponse = unknown>(
	input: RequestInfo | URL,
	init?: RequestInit,
	options?: C
) => Promise<FetchResponse<TResponse>>

const fetchRequester: Requester = <TResponse = unknown>(
	input: RequestInfo | URL,
	init?: RequestInit,
	options?: ExcludedFetchOptions
) => {
	// @ts-ignore
	return request.raw<TResponse>(input as string, { ...init, ...options })
}

export default hc<Api>(BASE_URL + '/api', { fetch: fetchRequester })
