import createDot from './createDot'
import createHolder from './createHolder'

import type { WaveConfig } from '../index'

const Index: WaveConfig['showEffect'] = (node, { event }) => {
	const holder = createHolder(node)

	const rect = holder.getBoundingClientRect()
	const left = event.clientX - rect.left
	const top = event.clientY - rect.top

	const dot = createDot(holder, 'var(--wave)', left, top)

	requestAnimationFrame(() => {
		dot.ontransitionend = () => {
			holder.parentElement?.removeChild(holder)
		}

		dot.style.width = `${rect.width * 2}px`
		dot.style.height = `${rect.width * 2}px`
		dot.style.opacity = '0'
	})
}

export default Index
