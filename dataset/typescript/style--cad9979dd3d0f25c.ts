import { code } from './code.css'
import { heading } from './heading.css'
import { init_note, init_text } from './init.css'
import { link } from './link.css'
import { list, mini as mini_list } from './list.css'
import { navigation } from './navigation.css'
import { quote } from './quote.css'
import { table } from './table.css'
import { text } from './text.css'
import { toggle } from './toggle.css'

export { linebreak as linebreak_style } from './init.css'

export const note_style = [init_note, heading, text, code, list, link, quote, toggle, table, navigation]
export const text_style = [init_text, heading, text, list, mini_list, link]
