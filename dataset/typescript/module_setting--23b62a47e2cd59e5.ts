import { toTypedRxJsonSchema } from 'rxdb'

import { keyCompression } from '@/config'
import { getCrdtSchema } from '@/utils'

import schema_raw from './output/module_setting'

import type { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from 'rxdb'
import type { RxDB } from '@/types'

const schema = toTypedRxJsonSchema(
	getCrdtSchema({
		version: 0,
		primaryKey: 'file_id',
		keyCompression,
		indexes: ['module'],
		...schema_raw['ModuleSetting.Item']
	} as const)
)

export type DocModuleSetting = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schema>
export type DBModuleSetting = RxDB.RxCollectionWithFunctions<DocModuleSetting>

export const schema_module_setting: RxJsonSchema<DocModuleSetting> = schema
