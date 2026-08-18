import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioConflictErrorTransform,
	AttioNotFoundErrorTransform,
	AttioSystemEditErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { CurrencyCode } from "../schemas/values.js"
import { DataStruct, Uuid } from "../shared/schemas.js"

export const AttributeTarget = Schema.Literals(["objects", "lists"])
export type AttributeTarget = (typeof AttributeTarget)["Type"]

const WritableAttributeType = Schema.Literals([
	"text",
	"number",
	"checkbox",
	"currency",
	"date",
	"timestamp",
	"rating",
	"status",
	"select",
	"record-reference",
	"actor-reference",
	"location",
	"domain",
	"email-address",
	"phone-number",
])

export const AttributeType = Schema.Union([
	WritableAttributeType,
	Schema.Literals(["interaction", "personal-name"]),
])

const AttributeId = Schema.Struct({
	workspace_id: Uuid,
	object_id: Uuid,
	attribute_id: Uuid,
})

const DynamicDefaultValue = Schema.Struct({
	type: Schema.Literal("dynamic"),
	template: Schema.String,
})

const StaticDefaultValue = Schema.Struct({
	type: Schema.Literal("static"),
	template: Schema.Array(Schema.Json),
})

const DefaultValue = Schema.NullOr(
	Schema.Union([DynamicDefaultValue, StaticDefaultValue]),
)

const AttributeRelationship = Schema.Struct({
	id: AttributeId,
	object_slug: Schema.String,
	title: Schema.String,
	api_slug: Schema.String,
	is_multiselect: Schema.Boolean,
})

const CurrencyDisplayType = Schema.Literals([
	"code",
	"name",
	"narrowSymbol",
	"symbol",
])

const CurrencyConfig = Schema.Struct({
	default_currency_code: Schema.NullOr(CurrencyCode),
	display_type: Schema.NullOr(CurrencyDisplayType),
})

const RecordReferenceConfig = Schema.Struct({
	allowed_object_ids: Schema.NullOr(Schema.Array(Uuid)),
})

const AttributeInputConfig = Schema.Struct({
	currency: Schema.optional(
		Schema.Struct({
			default_currency_code: CurrencyCode,
			display_type: CurrencyDisplayType,
		}),
	),
	record_reference: Schema.optional(
		Schema.Struct({
			allowed_objects: Schema.NonEmptyArray(Schema.String),
		}),
	),
})

export const Attribute = Schema.Struct({
	id: AttributeId,
	title: Schema.String,
	description: Schema.NullOr(Schema.String),
	api_slug: Schema.String,
	type: AttributeType,
	is_system_attribute: Schema.Boolean,
	is_writable: Schema.Boolean,
	is_required: Schema.Boolean,
	is_unique: Schema.Boolean,
	is_multiselect: Schema.Boolean,
	is_default_value_enabled: Schema.Boolean,
	is_archived: Schema.Boolean,
	default_value: DefaultValue,
	relationship: Schema.NullOr(AttributeRelationship),
	created_at: Schema.DateTimeUtcFromString,
	config: Schema.Struct({
		currency: CurrencyConfig,
		record_reference: RecordReferenceConfig,
	}),
})

const AttributeInput = Schema.Struct({
	title: Schema.String,
	description: Schema.NullOr(Schema.String),
	api_slug: Schema.String,
	type: WritableAttributeType,
	is_required: Schema.Boolean,
	is_unique: Schema.Boolean,
	is_multiselect: Schema.Boolean,
	default_value: Schema.optional(DefaultValue),
	relationship: Schema.optional(
		Schema.NullOr(
			Schema.Struct({
				object: Schema.String,
				title: Schema.String,
				api_slug: Schema.String,
				is_multiselect: Schema.Boolean,
			}),
		),
	),
	config: AttributeInputConfig,
})

const AttributeUpdate = Schema.Struct({
	title: Schema.optional(Schema.String),
	description: Schema.optional(Schema.NullOr(Schema.String)),
	api_slug: Schema.optional(Schema.String),
	is_required: Schema.optional(Schema.Boolean),
	is_unique: Schema.optional(Schema.Boolean),
	default_value: Schema.optional(DefaultValue),
	config: Schema.optional(AttributeInputConfig),
	is_archived: Schema.optional(Schema.Boolean),
})

export const SelectOption = Schema.Struct({
	id: Schema.Struct({
		...AttributeId.fields,
		option_id: Uuid,
	}),
	title: Schema.String,
	is_archived: Schema.Boolean,
})

export const Status = Schema.Struct({
	id: Schema.Struct({
		...AttributeId.fields,
		status_id: Uuid,
	}),
	title: Schema.String,
	is_archived: Schema.Boolean,
	celebration_enabled: Schema.Boolean,
	target_time_in_status: Schema.NullOr(Schema.String),
})

const AttributeListParams = Schema.Struct({
	limit: Schema.optional(Schema.Int),
	offset: Schema.optional(Schema.Int),
	show_archived: Schema.optional(Schema.Boolean),
})

const ArchivedListParams = Schema.Struct({
	show_archived: Schema.optional(Schema.Boolean),
})

const SelectOptionInput = Schema.Struct({ title: Schema.NonEmptyString })
const SelectOptionUpdate = Schema.Struct({
	title: Schema.optional(Schema.NonEmptyString),
	is_archived: Schema.optional(Schema.Boolean),
})
const StatusInput = Schema.Struct({
	title: Schema.NonEmptyString,
	celebration_enabled: Schema.optional(Schema.Boolean),
	target_time_in_status: Schema.optional(Schema.NullOr(Schema.String)),
})
const StatusUpdate = Schema.Struct({
	title: Schema.optional(Schema.NonEmptyString),
	celebration_enabled: Schema.optional(Schema.Boolean),
	target_time_in_status: Schema.optional(Schema.NullOr(Schema.String)),
	is_archived: Schema.optional(Schema.Boolean),
})

const makeAttioAttributes = Effect.gen(function* () {
	const http = yield* AttioHttpClient
	const path = (target: AttributeTarget, identifier: string) =>
		`/v2/${target}/${identifier}/attributes`
	const decodeData = <A, I>(output: Schema.Codec<A, I, never, never>) =>
		function <E, R>(
			response: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
		) {
			return response.pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(output))),
				Effect.map((body) => body.data),
			)
		}
	const send = Effect.fn("AttioAttributes.send")(function* <A, I, O, OI>(
		request: HttpClientRequest.HttpClientRequest,
		inputSchema: Schema.Codec<A, I, never, never>,
		outputSchema: Schema.Codec<O, OI, never, never>,
		input: A,
	) {
		const data = yield* Schema.encodeEffect(inputSchema)(input)
		return yield* request.pipe(
			HttpClientRequest.bodyJson({ data }),
			Effect.flatMap(http.execute),
			decodeData(outputSchema),
		)
	})

	return {
		list: Effect.fn("AttioAttributes.list")(function* (
			target: AttributeTarget,
			identifier: string,
			params?: (typeof AttributeListParams)["Type"],
		) {
			const query = yield* Schema.encodeEffect(AttributeListParams)(
				params ?? {},
			)
			return yield* HttpClientRequest.get(path(target, identifier)).pipe(
				HttpClientRequest.appendUrlParams(query),
				http.execute,
				decodeData(Schema.Array(Attribute)),
			)
		}),

		create: Effect.fn("AttioAttributes.create")(function* (
			target: AttributeTarget,
			identifier: string,
			attribute: (typeof AttributeInput)["Type"],
		) {
			return yield* send(
				HttpClientRequest.post(path(target, identifier)),
				AttributeInput,
				Attribute,
				attribute,
			).pipe(
				mapAttioErrors(
					AttioValidationErrorTransform,
					AttioNotFoundErrorTransform,
					AttioConflictErrorTransform,
				),
			)
		}),

		get: Effect.fn("AttioAttributes.get")(function* (
			target: AttributeTarget,
			identifier: string,
			attribute: string,
		) {
			return yield* http
				.get(`${path(target, identifier)}/${attribute}`)
				.pipe(
					decodeData(Attribute),
					mapAttioErrors(AttioNotFoundErrorTransform),
				)
		}),

		update: Effect.fn("AttioAttributes.update")(function* (
			target: AttributeTarget,
			identifier: string,
			attribute: string,
			update: (typeof AttributeUpdate)["Type"],
		) {
			return yield* send(
				HttpClientRequest.patch(`${path(target, identifier)}/${attribute}`),
				AttributeUpdate,
				Attribute,
				update,
			).pipe(
				mapAttioErrors(
					AttioValidationErrorTransform,
					AttioSystemEditErrorTransform,
					AttioNotFoundErrorTransform,
					AttioConflictErrorTransform,
				),
			)
		}),

		listSelectOptions: Effect.fn("AttioAttributes.listSelectOptions")(
			function* (
				target: AttributeTarget,
				identifier: string,
				attribute: string,
				params?: (typeof ArchivedListParams)["Type"],
			) {
				const query = yield* Schema.encodeEffect(ArchivedListParams)(
					params ?? {},
				)
				return yield* HttpClientRequest.get(
					`${path(target, identifier)}/${attribute}/options`,
				).pipe(
					HttpClientRequest.appendUrlParams(query),
					http.execute,
					decodeData(Schema.Array(SelectOption)),
					mapAttioErrors(AttioNotFoundErrorTransform),
				)
			},
		),

		createSelectOption: Effect.fn("AttioAttributes.createSelectOption")(
			function* (
				target: AttributeTarget,
				identifier: string,
				attribute: string,
				option: (typeof SelectOptionInput)["Type"],
			) {
				return yield* send(
					HttpClientRequest.post(
						`${path(target, identifier)}/${attribute}/options`,
					),
					SelectOptionInput,
					SelectOption,
					option,
				).pipe(
					mapAttioErrors(
						AttioValidationErrorTransform,
						AttioNotFoundErrorTransform,
					),
				)
			},
		),

		updateSelectOption: Effect.fn("AttioAttributes.updateSelectOption")(
			function* (
				target: AttributeTarget,
				identifier: string,
				attribute: string,
				option: string,
				update: (typeof SelectOptionUpdate)["Type"],
			) {
				return yield* send(
					HttpClientRequest.patch(
						`${path(target, identifier)}/${attribute}/options/${option}`,
					),
					SelectOptionUpdate,
					SelectOption,
					update,
				).pipe(
					mapAttioErrors(
						AttioValidationErrorTransform,
						AttioNotFoundErrorTransform,
					),
				)
			},
		),

		listStatuses: Effect.fn("AttioAttributes.listStatuses")(function* (
			target: AttributeTarget,
			identifier: string,
			attribute: string,
			params?: (typeof ArchivedListParams)["Type"],
		) {
			const query = yield* Schema.encodeEffect(ArchivedListParams)(params ?? {})
			return yield* HttpClientRequest.get(
				`${path(target, identifier)}/${attribute}/statuses`,
			).pipe(
				HttpClientRequest.appendUrlParams(query),
				http.execute,
				decodeData(Schema.Array(Status)),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),

		createStatus: Effect.fn("AttioAttributes.createStatus")(function* (
			target: AttributeTarget,
			identifier: string,
			attribute: string,
			status: (typeof StatusInput)["Type"],
		) {
			return yield* send(
				HttpClientRequest.post(
					`${path(target, identifier)}/${attribute}/statuses`,
				),
				StatusInput,
				Status,
				status,
			).pipe(
				mapAttioErrors(
					AttioValidationErrorTransform,
					AttioNotFoundErrorTransform,
				),
			)
		}),

		updateStatus: Effect.fn("AttioAttributes.updateStatus")(function* (
			target: AttributeTarget,
			identifier: string,
			attribute: string,
			status: string,
			update: (typeof StatusUpdate)["Type"],
		) {
			return yield* send(
				HttpClientRequest.patch(
					`${path(target, identifier)}/${attribute}/statuses/${status}`,
				),
				StatusUpdate,
				Status,
				update,
			).pipe(
				mapAttioErrors(
					AttioValidationErrorTransform,
					AttioNotFoundErrorTransform,
				),
			)
		}),
	}
})

export class AttioAttributes extends Context.Service<
	AttioAttributes,
	Effect.Success<typeof makeAttioAttributes>
>()("effect-attio/services/AttioAttributes") {
	static readonly layer = Layer.effect(
		AttioAttributes,
		Effect.map(makeAttioAttributes, AttioAttributes.of),
	)
}

type ConfiguredAttributeArgs<
	Args extends ReadonlyArray<unknown>,
	ObjectName extends string,
	ListName extends string,
> = Args extends readonly [unknown, unknown, ...infer Rest]
	?
			| [target: "objects", identifier: ObjectName, ...rest: Rest]
			| [target: "lists", identifier: ListName, ...rest: Rest]
	: Args

export type GenericAttioAttributes<
	ObjectName extends string,
	ListName extends string,
> = {
	readonly [
		Method in keyof AttioAttributes["Service"]
	]: AttioAttributes["Service"][Method] extends (
		...args: infer Args
	) => infer Result
		? (...args: ConfiguredAttributeArgs<Args, ObjectName, ListName>) => Result
		: AttioAttributes["Service"][Method]
}
