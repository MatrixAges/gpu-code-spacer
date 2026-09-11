import { toTypedRxJsonSchema } from 'rxdb'

import { keyCompression } from '@/config'
import { getCrdtSchema } from '@/utils'

import schema_raw from './output/dirtree_items'

import type { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from 'rxdb'
import type { RxDB } from '@/types'

const schema = toTypedRxJsonSchema(
	getCrdtSchema({
		version: 0,
		primaryKey: 'id',
		keyCompression,
		indexes: ['module'],
		...schema_raw['DirTree.Item']
	} as const)
)

export type DocDirtreeItems = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schema>
export type DBDirtreeItems = RxDB.RxCollectionWithFunctions<DocDirtreeItems>

export const schema_dirtree_items: RxJsonSchema<DocDirtreeItems> = schema
