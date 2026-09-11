import { ELEMENT_TRANSFORMERS, TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS } from '@lexical/markdown'

import Code from './Code'
import Divider from './Divider'
import { Image_element, Image_text } from './Image'
import { Katex_block, Katex_inline } from './Katex'
import Pairs from './Pairs'
import Quote from './Quote'
import Table from './Table'
import { Toggle_export, Toggle_import } from './Toggle'

const exludes = ['^[ \\t]*```(\\w{1,10})?\\s', '^>\\s']

export default [
	...ELEMENT_TRANSFORMERS.filter(item => !exludes.includes(item.regExp.source)),
	...TEXT_FORMAT_TRANSFORMERS,
	...TEXT_MATCH_TRANSFORMERS,
	...Pairs,
	Divider,
	Code,
	Image_text,
	Image_element,
	Katex_inline,
	Katex_block,
	Quote,
	Table,
	Toggle_import,
	Toggle_export
]
