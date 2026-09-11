import { is_prod, is_sandbox } from './is'

export const BASE_URL = is_sandbox
	? 'https://if-server-sandbox.openages.com'
	: is_prod
		? 'https://if-server.openages.com'
		: 'http://localhost:8080'

export const paddle_client_token = is_sandbox ? 'test_42487f9c268654736359e895d17' : 'live_56135f0aabb949f82ff23a48d63'
