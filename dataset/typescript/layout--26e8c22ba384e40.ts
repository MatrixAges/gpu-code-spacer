import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import Utils from '@/models/utils'
import { getComputedStyleValue, ipc, is_electron_shell } from '@/utils'
import { setStorageWhenChange } from '@openages/stk/mobx'

@injectable()
export default class Index {
	dirtree_width = 0
	dirtree_prev = 0
	blur = false
	maximize = false

	constructor(public utils: Utils) {
		makeAutoObservable(this, { utils: false }, { autoBind: true })
	}

	init() {
		this.utils.acts = [setStorageWhenChange(['dirtree_prev', 'dirtree_width'], this)]

		if (this.dirtree_width === 0 && this.dirtree_prev === 0) {
			this.setDirTreeWidth(getComputedStyleValue(document.documentElement, '--dirtree_width'))

			return
		}

		this.setDirTreeWidth(this.dirtree_width)

		if (is_electron_shell) this.onWindowBlur()
	}

	onWindowBlur() {
		ipc.app.on.subscribe(undefined, {
			onData: ({ type, value }) => {
				switch (type) {
					case 'blur':
						if (this.blur !== value) this.blur = value
						break
					case 'maximize':
						if (this.maximize !== value) this.maximize = value
						break
				}
			}
		})
	}

	toggleDirTreeVisible() {
		if (this.dirtree_width === 0) return this.setDirTreeWidth(this.dirtree_prev || 222)

		this.dirtree_prev = this.dirtree_width

		this.setDirTreeWidth(0)
	}

	setDirTreeWidth(v: number) {
		this.dirtree_width = v

		document.documentElement.style.setProperty('--dirtree_width', v + 'px')
	}

	off() {
		this.utils.off()
	}
}
