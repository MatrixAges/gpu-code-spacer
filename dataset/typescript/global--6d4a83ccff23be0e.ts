import { conf, id } from '@/utils'
import { local } from '@openages/stk/storage'

if (window.$shell?.type === 'electron') {
	setTimeout(() => window.$shell?.stopLoading(), 0)

	local.mid = await conf.get('mid')
} else {
	if (!local.mid) local.mid = id()
}
