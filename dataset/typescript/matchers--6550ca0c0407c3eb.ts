import { createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin'

const URL_REGEX =
	/\b(?:https?:\/\/)?(?:www\.)?(?![\s@])(?:[a-zA-Z0-9-]+)(?:\.[a-zA-Z0-9-]+)*\.(?:com|cn|org|net|edu|gov|io|info|biz|name|pro|xyz|us|uk|ca|de|fr|jp|ru|au|nz|kr|nl|es|it|se|no|ch|at|dk|fi|be|pl|cz|hu|pt|br|mx|ar|tr|gr|za|ie|in|sg|hk|tw|th|id|vn|ph|my|pk|bd|lk|ai)(?![\w\-@])(?:\/\S*)?\b/

const EMAIL_REGEX =
	/(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/

export default [
	createLinkMatcherWithRegExp(EMAIL_REGEX, text => {
		return `mailto:${text}`
	}),
	createLinkMatcherWithRegExp(URL_REGEX, text => {
		return text.startsWith('http') ? text : `https://${text}`
	})
]
