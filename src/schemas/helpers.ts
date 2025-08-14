import { Schema } from "effect"
import type { AttributeDef } from "./attributes.js"
import * as Attributes from "./attributes.js"

/**
 * Helper for read-only fields that cannot be written via the API
 */
export const ReadOnlyAttribute = <T extends AttributeDef>(field: T) => ({
	input: Schema.Void,
	output: field.output,
})

/**
 * Helper for optional fields that may not be present in the response
 */
export const OptionalAttribute = <T extends AttributeDef>(field: T) => ({
	input: Schema.optional(field.input),
	output: Schema.optional(field.output),
})

const baseObjectAttributes = {
	created_at: ReadOnlyAttribute(Attributes.Timestamp),
	created_by: ReadOnlyAttribute(Attributes.ActorReference),
	record_id: ReadOnlyAttribute(Attributes.Text),
}

type BaseAttributes = typeof baseObjectAttributes

type MergedFields<T extends Record<string, AttributeDef>> = BaseAttributes & T

export function createSchemas<T extends Record<string, AttributeDef>>(
	fields: T,
) {
	const allFields = { ...baseObjectAttributes, ...fields } as MergedFields<T>

	const inputFields = {} as any
	const outputFields = {} as any

	for (const key in allFields) {
		if (allFields[key]) {
			inputFields[key] = allFields[key].input
			outputFields[key] = allFields[key].output
		}
	}

	return {
		input: Schema.Struct(inputFields) as Schema.Struct<{
			[K in keyof MergedFields<T>]: MergedFields<T>[K]["input"]
		}>,
		output: Schema.Struct(outputFields) as Schema.Struct<{
			[K in keyof MergedFields<T>]: MergedFields<T>[K]["output"]
		}>,
		fields: allFields,
	}
}
