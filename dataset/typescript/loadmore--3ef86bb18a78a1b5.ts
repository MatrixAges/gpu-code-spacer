import { makeAutoObservable } from 'mobx'

export default class Index {
	page = 0
	end = false

	constructor() {
		makeAutoObservable(this, {}, { autoBind: true })
	}

	loadMore() {
		if (this.end) return

		this.page = this.page + 1
	}
}
