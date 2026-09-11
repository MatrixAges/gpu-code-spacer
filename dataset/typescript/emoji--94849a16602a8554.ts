import { init } from 'emoji-mart'

import { custom_emojis } from '@/components'
import _data from '@emoji-mart/data'

import type { EmojiMartData } from '@emoji-mart/data'

const data = _data as EmojiMartData

init({ data: { ...data, emojis: { ...data.emojis, ...custom_emojis.icon_object } } })
