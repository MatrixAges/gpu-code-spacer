import { toTypedRxJsonSchema } from 'rxdb'

import { keyCompression } from '@/config'

import schema_raw from './output/pomo_items'

import type { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from 'rxdb'
import type { RxDB } from '@/types'

const schema = toTypedRxJsonSchema({
	version: 0,
	primaryKey: 'file_id',
	keyCompression,
	...schema_raw['Pomo.Item']
} as const)

export type DocPomoItems = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schema>
export type DBPomoItems = RxDB.RxCollectionWithFunctions<DocPomoItems>

export const schema_pomo_items: RxJsonSchema<DocPomoItems> = schema
