import { toTypedRxJsonSchema } from 'rxdb'

import { keyCompression } from '@/config'
import { getCrdtSchema } from '@/utils'

import schema_raw from './output/schedule_items'

import type { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from 'rxdb'
import type { RxDB } from '@/types'

const schema = toTypedRxJsonSchema(
	getCrdtSchema({
		version: 1,
		primaryKey: 'id',
		keyCompression,
		indexes: ['file_id', 'tag', 'start_time', 'end_time'],
		...schema_raw['Schedule.Item']
	} as const)
)

export type DocScheduleItems = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schema>
export type DBScheduleItems = RxDB.RxCollectionWithFunctions<DocScheduleItems>

export const schema_schedule_items: RxJsonSchema<DocScheduleItems> = schema
