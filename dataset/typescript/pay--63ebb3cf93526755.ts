import { is_sandbox } from '@/utils'

export const plan_level = new Map([
	['free', 0],
	['pro', 1],
	['max', 2],
	['team', 3],
	['sponsor', 4],
	['gold_sponsor', 5]
] as const)

export const paddle = {
	sandbox: {
		price_id: {
			pro: 'pri_01jgk3rw9pstc64rdyp00v8de5',
			infinity: 'pri_01jgk3txm1myyh6c292p7zfyzk'
		}
	},
	production: {
		price_id: {
			pro: 'pri_01jh0jpnppydd7g8gvxp1sda2r',
			infinity: 'pri_01jh0jmdcp7afgcbxyknbwxb5x'
		}
	}
}

export const getPaddleConfig = () => (is_sandbox ? paddle.sandbox : paddle.production)

export const getPaddlePriceItems = () => {
	const paddle_config = getPaddleConfig()

	return [
		{ priceId: paddle_config.price_id.pro, quantity: 1 },
		{ priceId: paddle_config.price_id.infinity, quantity: 1 }
	]
}
