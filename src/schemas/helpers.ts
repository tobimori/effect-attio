import * as Schema from "effect/Schema"
import type { AttributeDef } from "./attribute-builder.js"
import * as Attributes from "./attributes.js"

/**
 * Helper for optional fields that may not be present in the response
 */
export const OptionalAttribute = <T extends AttributeDef>(field: T) => ({
	input: Schema.optional(field.input),
	output: Schema.optional(field.output),
})

type AttributeLike = AttributeDef

type BaseAttributes<IdField extends "record_id" | "entry_id"> = {
	created_at: typeof Attributes.Timestamp.ReadOnly
	created_by: typeof Attributes.ActorReference.ReadOnly
} & Record<IdField, typeof Attributes.Text.ReadOnly>

type AttributeFields<T> = {
	[
		K in keyof T as T[K] extends AttributeLike ? K : never
	]: T[K] extends AttributeLike ? T[K] : never
}

type MergedFields<
	T,
	IdField extends "record_id" | "entry_id",
> = BaseAttributes<IdField> & AttributeFields<T>

type InputFields<T, IdField extends "record_id" | "entry_id"> = {
	[
		K in keyof MergedFields<T, IdField> as MergedFields<
			T,
			IdField
		>[K]["input"] extends Schema.Void
			? never
			: K
	]: MergedFields<T, IdField>[K]["input"] extends Schema.Constraint
		? MergedFields<T, IdField>[K]["input"]
		: never
}

type OutputFields<T, IdField extends "record_id" | "entry_id"> = {
	[K in keyof MergedFields<T, IdField>]: MergedFields<
		T,
		IdField
	>[K]["output"] extends Schema.Constraint
		? MergedFields<T, IdField>[K]["output"]
		: never
}

export interface CreatedSchemas<T, IdField extends "record_id" | "entry_id"> {
	readonly input: Schema.Struct<InputFields<T, IdField>>
	readonly output: Schema.Struct<OutputFields<T, IdField>>
	readonly fields: MergedFields<T, IdField>
}

export function createSchemas<
	T extends Record<string, AttributeLike>,
	IdField extends "record_id" | "entry_id",
>(fields: T, idField: IdField): CreatedSchemas<T, IdField> {
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

	return {
		input: Schema.Struct(inputFields),
		output: Schema.Struct(outputFields),
		fields: allFields as unknown as MergedFields<T, IdField>,
	}
}
