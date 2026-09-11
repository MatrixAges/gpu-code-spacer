import { $createToggleNode } from './index'

export default (dom: HTMLDetailsElement) => {
	const open = dom.getAttribute('lexical-toggle-open')

	if (open === undefined) return null

	const node = $createToggleNode({ open: Boolean(open) })

	return { node }
}
