import { Schema } from "effect"
import * as ParseResult from "effect/ParseResult"
import { Actor } from "../shared/schemas.js"

export interface AttributeDef {
	input: Schema.Schema.Any
	output: Schema.Schema.Any
}

export const BaseAttribute = Schema.Struct({
	active_from: Schema.String,
	active_until: Schema.NullOr(Schema.String),
	created_by_actor: Actor,
})

/**
 * Transforms array to single value (empty array becomes null)
 */
export const ApiSingleValue = <A, I, R>(itemSchema: Schema.Schema<A, I, R>) =>
	Schema.transformOrFail(
		Schema.Array(itemSchema).pipe(Schema.maxItems(1)),
		Schema.NullOr(Schema.typeSchema(itemSchema)),
		{
			strict: false,
			decode: (arr) => ParseResult.succeed(arr.length === 0 ? null : arr[0]),
			encode: (item) => ParseResult.succeed(item === null ? [] : [item]),
		},
	)

/**
 * Transforms array to single value (requires exactly one item)
 */
export const ApiSingleValueRequired = <A, I, R>(
	itemSchema: Schema.Schema<A, I, R>,
) =>
	Schema.transformOrFail(
		Schema.Array(itemSchema).pipe(Schema.minItems(1), Schema.maxItems(1)),
		Schema.typeSchema(itemSchema),
		{
			strict: false,
			decode: (arr) => ParseResult.succeed(arr[0]),
			encode: (item) => ParseResult.succeed([item]),
		},
	)

type BaseAttributeVariations<T extends AttributeDef> = {
	input: Schema.optional<T["input"]>
	output: ReturnType<typeof ApiSingleValue<T["output"], any, any>>
	Required: {
		input: T["input"]
		output: ReturnType<typeof ApiSingleValueRequired<T["output"], any, any>>
	}
	ReadOnly: {
		input: Schema.Void
		output: ReturnType<typeof ApiSingleValue<T["output"], any, any>>
	}
}

type AttributeWithMultiple<T extends AttributeDef> =
	BaseAttributeVariations<T> & {
		Multiple: {
			input: Schema.optional<Schema.Array$<T["input"]>>
			output: Schema.Array$<T["output"]>
			Required: {
				input: Schema.Array$<T["input"]>
				output: Schema.filter<Schema.Array$<Schema.Schema.Any>>
			}
			ReadOnly: {
				input: Schema.Void
				output: Schema.Array$<T["output"]>
			}
		}
	}

/**
 * Creates an attribute with variations
 */
export function makeAttribute<T extends AttributeDef>(
	base: T,
): BaseAttributeVariations<T>
export function makeAttribute<T extends AttributeDef>(
	base: T,
	options: { multiple: true },
): AttributeWithMultiple<T>
export function makeAttribute<T extends AttributeDef>(
	base: T,
	options?: { multiple?: boolean },
): BaseAttributeVariations<T> | AttributeWithMultiple<T> {
	const enrichedOutput = Schema.extend(base.output, BaseAttribute)

	const result = Object.assign(
		{
			input: Schema.optional(base.input),
			output: ApiSingleValue(enrichedOutput),
		},
		{
			Required: {
				input: base.input,
				output: ApiSingleValueRequired(enrichedOutput),
			},
			ReadOnly: {
				input: Schema.Void,
				output: ApiSingleValue(enrichedOutput),
			},
		},
	)

	if (options?.multiple) {
		return Object.assign(result, {
			Multiple: Object.assign(
				{
					input: Schema.optional(Schema.Array(base.input)),
					output: Schema.Array(enrichedOutput),
				},
				{
					Required: {
						input: Schema.Array(base.input),
						output: Schema.Array(enrichedOutput).pipe(Schema.minItems(1)),
					},
					ReadOnly: {
						input: Schema.Void,
						output: Schema.Array(enrichedOutput),
					},
				},
			),
		})
	}

	return result
}
