import to from 'await-to-js'
import { ofetch } from 'ofetch'

import { getHTTPStatusCodeFromError } from '@trpc/server/http'

import { goLogin } from './auth'
import { BASE_URL } from './env'

import type { FetchContext } from 'ofetch'

const onRequestError = (res: FetchContext) => {
	const { response, error } = res
	const { status } = response!

	$message.error(`${status}: ${error?.message}`)
}

const onResponseError = async (res: FetchContext) => {
	const response = res.response!
	const { status } = response

	let err: unknown

	const [err_json, res_json] = await to(response.clone().json())

	if (err_json) {
		err = await response.clone().text()
	} else {
		err = res_json
	}

	switch (status) {
		case 401:
			goLogin()

			break
		case 429:
			$message.error($t('app.too_many_req'))

			break
		case 400:
			if (Array.isArray(err)) {
				err.forEach(item => {
					const data = item.error.data

					Object.keys(data).forEach(key => {
						$message.error(`${key}: ${data[key]}`)
					})
				})
			}

			break
		case 500:
			if (Array.isArray(err)) {
				err.forEach(item => {
					const error = item.error

					if (error) {
						const code = getHTTPStatusCodeFromError(error)

						$message.error(`${code}: ${error?.message}`)
					}
				})
			}
		default:
			if (typeof err === 'string') {
				$message.error(err as string)
			}

			break
	}

	return Promise.reject(res)
}

export const request = ofetch.create({
	responseType: 'stream',
      timeout:9000,
	onRequestError,
	onResponseError
})

export const api = ofetch.create({
	baseURL: BASE_URL + '/api',
      timeout:9000,
	onRequestError,
	onResponseError
})
