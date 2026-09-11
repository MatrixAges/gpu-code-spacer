import fs from 'fs'
import * as globby from 'globby'
import * as tsj from 'ts-json-schema-generator'

import handleSchema from '../utils/rxdb/handleSchema'

import type { Config } from 'ts-json-schema-generator'

const root = process.cwd()
const paths = globby.globbySync([`${root}/types/schema/*.ts`])

const getConfig = (path: string) => {
	return {
		path,
		type: '*',
		skipTypeCheck: true,
		topRef: true,
		encodeRefs: true,
		additionalProperties: true,
		extraTags: ['x_ref']
	} as Config
}

paths.map(item => {
	const buffer = tsj.createGenerator(getConfig(item)).createSchema('*')

	// console.log(JSON.stringify(buffer,null,4));

	const schema = handleSchema(buffer.definitions, buffer.definitions)

	fs.writeFileSync(
		`${root}/schemas/output/${item.split('/').pop()}`,
		`export default ${JSON.stringify(schema, null, 6)} as const`
	)
})
