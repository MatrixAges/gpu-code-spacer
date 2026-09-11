import { $createNavigationNode } from './index'

export default (dom: HTMLElement) => {
	if (!dom.getAttribute('lexical-navigation')) return null

	return { node: $createNavigationNode() }
}
