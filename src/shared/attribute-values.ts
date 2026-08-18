import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type { AttributeDef } from "../schemas/attribute-builder.js"

export interface AttributeHistoryWrite<Value> {
	readonly values: ReadonlyArray<{
		readonly value: Value
		readonly active_from: DateTime.DateTime
		readonly active_until: DateTime.DateTime | null
	}>
	readonly replace_history: true
}

type InputValue<Attribute extends AttributeDef> = Exclude<
	Attribute["input"]["Type"],
	undefined
>

export type AttributeHistoryInputValue<Attribute extends AttributeDef> =
	InputValue<Attribute> extends ReadonlyArray<infer Value>
		? Value
		: InputValue<Attribute>

const AttributeHistoryBody = Schema.Struct({
	data: Schema.Struct({
		values: Schema.Array(
			Schema.Struct({
				value: Schema.Json,
				active_from: Schema.String,
				active_until: Schema.NullOr(Schema.String),
			}),
		),
		replace_history: Schema.Literal(true),
	}),
})

const normalizeValue = (
	value: unknown,
	queryValueType?: "date" | "timestamp",
): Schema.Json => {
	if (DateTime.isDateTime(value)) {
		return queryValueType === "date"
			? DateTime.formatIsoDate(value)
			: DateTime.formatIso(value)
	}
	if (Array.isArray(value)) {
		return value.map((item) => normalizeValue(item, queryValueType))
	}
	if (Predicate.isObject(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				normalizeValue(item, queryValueType),
			]),
		)
	}
	return value as Schema.Json
}

export const encodeAttributeHistory = Effect.fn(
	"AttioAttributeValues.encodeHistory",
)(function* (
	data: AttributeHistoryWrite<unknown>,
	queryValueType?: "date" | "timestamp",
) {
	return yield* Schema.encodeUnknownEffect(AttributeHistoryBody)({
		data: {
			...data,
			values: data.values.map((item) => ({
				...item,
				value: normalizeValue(item.value, queryValueType),
				active_from: DateTime.formatIso(item.active_from),
				active_until: item.active_until
					? DateTime.formatIso(item.active_until)
					: null,
			})),
		},
	})
})
