import * as Schema from "effect/Schema"
import * as SchemaTransformation from "effect/SchemaTransformation"
import type * as Struct from "effect/Struct"
import * as Tuple from "effect/Tuple"
import { Actor } from "../shared/schemas.js"

export interface AttributeDef {
	input: Schema.Top
	output: Schema.Top
	value?: Schema.Top
	readonly referenceTarget?: string
}

type WithReferenceTarget<
	ObjectName extends string,
	Field extends AttributeDef,
> = Field & { readonly referenceTarget: ObjectName }

type ReferenceTargetVariations<
	ObjectName extends string,
	Field extends AttributeDef,
> = {
	readonly [
		K in keyof Field as K extends "Required" | "ReadOnly" | "ReadOnlyOptional"
			? K
			: never
	]: Field[K] extends AttributeDef
		? WithReferenceTarget<ObjectName, Field[K]>
		: Field[K]
}

export type ReferenceTargetAttribute<
	ObjectName extends string,
	Field extends AttributeDef = AttributeDef,
> = WithReferenceTarget<ObjectName, Field> &
	ReferenceTargetVariations<ObjectName, Field> &
	(Field extends { Multiple: infer Multiple extends AttributeDef }
		? {
				readonly Multiple: WithReferenceTarget<ObjectName, Multiple> &
					ReferenceTargetVariations<ObjectName, Multiple>
			}
		: {})

export const withReferenceTarget = <
	const ObjectName extends string,
	Field extends AttributeDef,
>(
	objectName: ObjectName,
	field: Field,
): ReferenceTargetAttribute<ObjectName, Field> => {
	const mark = (attribute: AttributeDef) => {
		Object.defineProperty(attribute, "referenceTarget", { value: objectName })

		for (const variation of [
			"Required",
			"ReadOnly",
			"ReadOnlyOptional",
			"Multiple",
		] as const) {
			const nestedAttribute = (
				attribute as AttributeDef &
					Partial<Record<typeof variation, AttributeDef>>
			)[variation]

			if (nestedAttribute) mark(nestedAttribute)
		}
	}

	mark(field)
	return field as ReferenceTargetAttribute<ObjectName, Field>
}

export const BaseAttribute = Schema.Struct({
	active_from: Schema.DateTimeUtcFromString,
	active_until: Schema.NullOr(Schema.DateTimeUtcFromString),
	created_by_actor: Actor,
})

/**
 * Transforms array to single value (empty array becomes null)
 */
export const ApiSingleValue = <S extends Schema.Top>(itemSchema: S) =>
	Schema.Array(itemSchema)
		.check(Schema.isMaxLength(1))
		.pipe(
			Schema.decodeTo(
				Schema.NullOr(Schema.toType(itemSchema)),
				SchemaTransformation.transform({
					decode: (items) =>
						items.length === 0 ? null : (items[0] as S["Type"]),
					encode: (item) => (item === null ? [] : [item]),
				}),
			),
		)

/**
 * Transforms array to single value (requires exactly one item)
 */
export const ApiSingleValueRequired = <S extends Schema.Top>(itemSchema: S) =>
	Schema.Array(itemSchema)
		.check(Schema.isLengthBetween(1, 1))
		.pipe(
			Schema.decodeTo(
				Schema.toType(itemSchema),
				SchemaTransformation.transform({
					decode: (items) => items[0] as S["Type"],
					encode: (item) => [item],
				}),
			),
		)

type Extendable =
	| Schema.Struct<Schema.Struct.Fields>
	| Schema.Union<ReadonlyArray<Schema.Struct<Schema.Struct.Fields>>>

type EnrichedOutput<T extends Extendable> =
	T extends Schema.Struct<infer Fields>
		? Schema.Struct<Struct.Assign<Fields, (typeof BaseAttribute)["fields"]>>
		: T extends Schema.Union<infer Members>
			? Schema.Union<{
					readonly [K in keyof Members]: Members[K] extends Schema.Struct<
						infer Fields
					>
						? Schema.Struct<
								Struct.Assign<Fields, (typeof BaseAttribute)["fields"]>
							>
						: never
				}>
			: never

const enrichOutput = <T extends Extendable>(output: T): EnrichedOutput<T> =>
	("fields" in output
		? output.pipe(Schema.fieldsAssign(BaseAttribute.fields))
		: output.mapMembers(
				Tuple.map(Schema.fieldsAssign(BaseAttribute.fields)),
			)) as EnrichedOutput<T>

type BaseAttributeVariations<
	TInput extends Schema.Top,
	TOutput extends Extendable,
> = {
	input: Schema.optional<TInput>
	output: ReturnType<typeof ApiSingleValue<EnrichedOutput<TOutput>>>
	value: EnrichedOutput<TOutput>
	Required: {
		input: TInput
		output: ReturnType<typeof ApiSingleValueRequired<EnrichedOutput<TOutput>>>
		value: EnrichedOutput<TOutput>
	}
	ReadOnly: {
		input: Schema.Void
		output: ReturnType<typeof ApiSingleValueRequired<EnrichedOutput<TOutput>>>
		value: EnrichedOutput<TOutput>
	}
	ReadOnlyOptional: {
		input: Schema.Void
		output: ReturnType<typeof ApiSingleValue<EnrichedOutput<TOutput>>>
		value: EnrichedOutput<TOutput>
	}
}

type AttributeWithMultiple<
	TInput extends Schema.Top,
	TOutput extends Extendable,
> = BaseAttributeVariations<TInput, TOutput> & {
	Multiple: {
		input: Schema.optional<Schema.$Array<TInput>>
		output: Schema.$Array<EnrichedOutput<TOutput>>
		value: EnrichedOutput<TOutput>
		Required: {
			input: Schema.$Array<TInput>
			output: Schema.$Array<EnrichedOutput<TOutput>>
			value: EnrichedOutput<TOutput>
		}
		ReadOnly: {
			input: Schema.Void
			output: Schema.$Array<EnrichedOutput<TOutput>>
			value: EnrichedOutput<TOutput>
		}
		ReadOnlyOptional: {
			input: Schema.Void
			output: Schema.$Array<EnrichedOutput<TOutput>>
			value: EnrichedOutput<TOutput>
		}
	}
}

/**
 * Creates an attribute with variations
 */
export function makeAttribute<
	TInput extends Schema.Top,
	TOutput extends Extendable,
>(base: {
	input: TInput
	output: TOutput
}): BaseAttributeVariations<TInput, TOutput>
export function makeAttribute<
	TInput extends Schema.Top,
	TOutput extends Extendable,
>(
	base: { input: TInput; output: TOutput },
	options: { multiple: true },
): AttributeWithMultiple<TInput, TOutput>
export function makeAttribute<
	TInput extends Schema.Top,
	TOutput extends Extendable,
>(
	base: { input: TInput; output: TOutput },
	options?: { multiple?: boolean },
):
	| BaseAttributeVariations<TInput, TOutput>
	| AttributeWithMultiple<TInput, TOutput> {
	const enrichedOutput = enrichOutput(base.output)

	const result = Object.assign(
		{
			input: Schema.optional(base.input),
			output: ApiSingleValue(enrichedOutput),
			value: enrichedOutput,
		},
		{
			Required: {
				input: base.input,
				output: ApiSingleValueRequired(enrichedOutput),
				value: enrichedOutput,
			},
			ReadOnly: {
				input: Schema.Void,
				output: ApiSingleValueRequired(enrichedOutput),
				value: enrichedOutput,
			},
			ReadOnlyOptional: {
				input: Schema.Void,
				output: ApiSingleValue(enrichedOutput),
				value: enrichedOutput,
			},
		},
	)

	if (options?.multiple) {
		return Object.assign(result, {
			Multiple: Object.assign(
				{
					input: Schema.optional(Schema.Array(base.input)),
					output: Schema.Array(enrichedOutput),
					value: enrichedOutput,
				},
				{
					Required: {
						input: Schema.Array(base.input),
						output: Schema.Array(enrichedOutput).check(Schema.isMinLength(1)),
						value: enrichedOutput,
					},
					ReadOnly: {
						input: Schema.Void,
						output: Schema.Array(enrichedOutput).check(Schema.isMinLength(1)),
						value: enrichedOutput,
					},
					ReadOnlyOptional: {
						input: Schema.Void,
						output: Schema.Array(enrichedOutput),
						value: enrichedOutput,
					},
				},
			),
		})
	}

	return result
}
