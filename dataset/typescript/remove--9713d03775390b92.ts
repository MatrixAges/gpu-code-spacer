import { remove } from 'lodash-es'

type Item = {
	id: string
	children?: Array<any>
}

const Index = <T>(items: Array<T & Item>, id: string): T | undefined => {
	for (let index = 0; index < items.length; index++) {
		const item = items[index]

		if (item.id === id) {
			remove(items, item => item.id === id)

			return
		} else {
			if (item.children) return Index(item.children, id)
		}
	}

	return undefined
}

export default Index
