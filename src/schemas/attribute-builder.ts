import { Schema } from "effect"
import * as ParseResult from "effect/ParseResult"
import { Actor } from "../shared/schemas.js"

export interface AttributeDef {
	input: Schema.Schema.Any
	output: Schema.Schema.Any
}

export const BaseAttribute = Schema.Struct({
	active_from: Schema.DateTimeUtc,
	active_until: Schema.NullOr(Schema.DateTimeUtc),
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

type EnrichedOutput<T extends Schema.Schema.Any> = Schema.extend<
	T,
	typeof BaseAttribute
>

type BaseAttributeVariations<
	TInput extends Schema.Schema.Any,
	TOutput extends Schema.Schema.Any,
> = {
	input: Schema.optional<TInput>
	output: ReturnType<
		typeof ApiSingleValue<
			Schema.Schema.Type<EnrichedOutput<TOutput>>,
			Schema.Schema.Encoded<EnrichedOutput<TOutput>>,
			Schema.Schema.Context<EnrichedOutput<TOutput>>
		>
	>
	Required: {
		input: TInput
		output: ReturnType<
			typeof ApiSingleValueRequired<
				Schema.Schema.Type<EnrichedOutput<TOutput>>,
				Schema.Schema.Encoded<EnrichedOutput<TOutput>>,
				Schema.Schema.Context<EnrichedOutput<TOutput>>
			>
		>
	}
	ReadOnly: {
		input: Schema.Void
		output: ReturnType<
			typeof ApiSingleValueRequired<
				Schema.Schema.Type<EnrichedOutput<TOutput>>,
				Schema.Schema.Encoded<EnrichedOutput<TOutput>>,
				Schema.Schema.Context<EnrichedOutput<TOutput>>
			>
		>
	}
}

type AttributeWithMultiple<
	TInput extends Schema.Schema.Any,
	TOutput extends Schema.Schema.Any,
> = BaseAttributeVariations<TInput, TOutput> & {
	Multiple: {
		input: Schema.optional<Schema.Array$<TInput>>
		output: Schema.Array$<EnrichedOutput<TOutput>>
		Required: {
			input: Schema.Array$<TInput>
			output: Schema.filter<Schema.Array$<EnrichedOutput<TOutput>>>
		}
		ReadOnly: {
			input: Schema.Void
			output: Schema.filter<Schema.Array$<EnrichedOutput<TOutput>>>
		}
	}
}

/**
 * Creates an attribute with variations
 */
export function makeAttribute<
	TInput extends Schema.Schema.Any,
	TOutput extends Schema.Schema.Any,
>(base: {
	input: TInput
	output: TOutput
}): BaseAttributeVariations<TInput, TOutput>
export function makeAttribute<
	TInput extends Schema.Schema.Any,
	TOutput extends Schema.Schema.Any,
>(
	base: { input: TInput; output: TOutput },
	options: { multiple: true },
): AttributeWithMultiple<TInput, TOutput>
export function makeAttribute<
	TInput extends Schema.Schema.Any,
	TOutput extends Schema.Schema.Any,
>(
	base: { input: TInput; output: TOutput },
	options?: { multiple?: boolean },
):
	| BaseAttributeVariations<TInput, TOutput>
	| AttributeWithMultiple<TInput, TOutput> {
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
				output: ApiSingleValueRequired(enrichedOutput),
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
						output: Schema.Array(enrichedOutput).pipe(
							Schema.minItems(1) as any,
						),
					},
					ReadOnly: {
						input: Schema.Void,
						output: Schema.Array(enrichedOutput).pipe(
							Schema.minItems(1) as any,
						),
					},
				},
			),
		})
	}

	return result
}
