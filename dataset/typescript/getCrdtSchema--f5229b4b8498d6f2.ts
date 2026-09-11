//@ts-nocheck

import { getCRDTSchemaPart } from 'rxdb/plugins/crdt'

export default <T>(schema: T): T => {
	schema.properties['crdts'] = getCRDTSchemaPart()
	schema['crdt'] = { field: 'crdts' }

	// schema.properties['_cleaning_crdts'] = { type: 'string' }

	return schema
}
