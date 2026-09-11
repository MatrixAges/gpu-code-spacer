import type { RxDB } from '@/types'
import type { RxDocument } from 'rxdb'

export default <T>(arr: RxDB.ItemsDoc<T>) => {
	return arr.map(item => {
		const target = item.toMutableJSON()

		// @ts-ignore
		if (target['crdts']) delete target['crdts']

		return target
	})
}

export const getDocItem = <T>(item: RxDocument<T>) => {
	if (!item) return

	const target = item.toMutableJSON()

	// @ts-ignore
	if (target['crdts']) delete target['crdts']

	return target
}
