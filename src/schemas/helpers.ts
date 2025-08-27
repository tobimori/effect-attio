import { Schema } from "effect"
import type { AttributeDef } from "./attribute-builder.js"
import * as Attributes from "./attributes.js"

/**
 * Helper for optional fields that may not be present in the response
 */
export const OptionalAttribute = <T extends AttributeDef>(field: T) => ({
	input: Schema.optional(field.input),
	output: Schema.optional(field.output),
})

type AttributeLike = { input: any; output: any } // TODO: fix

export function createSchemas<
	T extends Record<string, AttributeLike>,
	IdField extends "record_id" | "entry_id"
>(
	fields: T,
	idField: IdField,
) {
	const baseAttributes = {
		created_at: Attributes.Timestamp.ReadOnly,
		created_by: Attributes.ActorReference.ReadOnly,
		[idField]: Attributes.Text.ReadOnly,
	}
	const allFields = { ...baseAttributes, ...fields }

	const inputFields = {} as any
	const outputFields = {} as any

	for (const key in allFields) {
		if (allFields[key]) {
			const field = allFields[key]
			// Only include in input if it's not Void (ReadOnly fields have Void input)
			// TODO: use never instead of void
			if (field.input !== Schema.Void) {
				inputFields[key] = field.input
			}

			outputFields[key] = field.output
		}
	}

	type BaseAttributes = {
		created_at: typeof Attributes.Timestamp.ReadOnly
		created_by: typeof Attributes.ActorReference.ReadOnly
	} & Record<IdField, typeof Attributes.Text.ReadOnly>
	
	type MergedFields = BaseAttributes & T

	return {
		input: Schema.Struct(inputFields) as Schema.Struct<{
			[K in keyof MergedFields as MergedFields[K]["input"] extends Schema.Void
				? never
				: K]: MergedFields[K]["input"]
		}>,
		output: Schema.Struct(outputFields) as Schema.Struct<{
			[K in keyof MergedFields]: MergedFields[K]["output"]
		}>,
		fields: allFields,
	}
}
