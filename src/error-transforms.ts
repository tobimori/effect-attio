import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SchemaTransformation from "effect/SchemaTransformation"
import * as HttpClientError from "effect/unstable/http/HttpClientError"
import {
	AttioConflictError,
	AttioFilterError,
	AttioForbiddenError,
	AttioImmutableValueError,
	AttioMissingValueError,
	AttioMultipleMatchError,
	AttioNotFoundError,
	AttioRateLimitError,
	AttioSystemEditError,
	AttioUnauthorizedError,
	AttioUniquenessConflictError,
	AttioValidationError,
} from "./errors.js"
import { HttpDate } from "./shared/http-date.js"

const transformAttioError = <From extends Schema.Top, To extends Schema.Top>(
	from: From,
	to: To,
	transformation: {
		readonly decode: (input: From["Type"]) => To["Encoded"]
		readonly encode: (input: To["Encoded"]) => From["Type"]
	},
) =>
	from.pipe(Schema.decodeTo(to, SchemaTransformation.transform(transformation)))

// 404 Not Found - code: "not_found"
export const AttioNotFoundErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(404),
		type: Schema.String,
		code: Schema.Literal("not_found"),
		message: Schema.String,
	}),
	AttioNotFoundError,
	{
		decode: (attioError) =>
			new AttioNotFoundError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 404 as const,
			type: "invalid_request_error",
			code: "not_found" as const,
			message: error.message,
		}),
	},
)

// 400 Bad Request - code: "validation_type" with validation_errors array
export const AttioValidationErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("validation_type"),
		message: Schema.String,
		validation_errors: Schema.Array(
			Schema.Struct({
				code: Schema.String,
				path: Schema.Array(Schema.Union([Schema.String, Schema.Number])),
				message: Schema.String,
				string_validation: Schema.optional(Schema.String),
			}),
		),
	}),
	AttioValidationError,
	{
		decode: (attioError) =>
			new AttioValidationError({
				message: attioError.message,
				errors: attioError.validation_errors.map((err) => ({
					code: err.code,
					path: err.path,
					message: err.message,
				})),
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: "validation_type" as const,
			message: error.message,
			validation_errors: error.errors.map((err) => ({
				...err,
				string_validation: undefined,
			})),
		}),
	},
)

// 400 Bad Request - code: "missing_value" or "value_not_found"
export const AttioMissingValueErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Union([
			Schema.Literal("missing_value"),
			Schema.Literal("value_not_found"),
		]),
		message: Schema.String,
	}),
	AttioMissingValueError,
	{
		decode: (attioError) =>
			new AttioMissingValueError({
				message: attioError.message,
				code: attioError.code,
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: error.code,
			message: error.message,
		}),
	},
)

// 400 Bad Request - code: "immutable_value"
export const AttioImmutableValueErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("immutable_value"),
		message: Schema.String,
	}),
	AttioImmutableValueError,
	{
		decode: (attioError) =>
			new AttioImmutableValueError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: "immutable_value" as const,
			message: error.message,
		}),
	},
)

// 400 Bad Request - code: "filter_error"
export const AttioFilterErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("filter_error"),
		message: Schema.String,
	}),
	AttioFilterError,
	{
		decode: (attioError) =>
			new AttioFilterError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: "filter_error" as const,
			message: error.message,
		}),
	},
)

// 400 Bad Request - code: "multiple_match_results"
export const AttioMultipleMatchErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("multiple_match_results"),
		message: Schema.String,
	}),
	AttioMultipleMatchError,
	{
		decode: (attioError) =>
			new AttioMultipleMatchError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: "multiple_match_results" as const,
			message: error.message,
		}),
	},
)

// 400 Bad Request - code: "system_edit_unauthorized"
export const AttioSystemEditErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("system_edit_unauthorized"),
		message: Schema.String,
	}),
	AttioSystemEditError,
	{
		decode: (attioError) =>
			new AttioSystemEditError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: "system_edit_unauthorized" as const,
			message: error.message,
		}),
	},
)

// 400 Bad Request - code: "uniqueness_conflict"
export const AttioUniquenessConflictErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("uniqueness_conflict"),
		message: Schema.String,
	}),
	AttioUniquenessConflictError,
	{
		decode: (attioError) =>
			new AttioUniquenessConflictError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: "uniqueness_conflict" as const,
			message: error.message,
		}),
	},
)

// 409 Conflict - code: "slug_conflict"
export const AttioConflictErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(409),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("slug_conflict"),
		message: Schema.String,
	}),
	AttioConflictError,
	{
		decode: (attioError) =>
			new AttioConflictError({
				message: attioError.message,
				code: attioError.code,
			}),
		encode: (error) => ({
			status_code: 409 as const,
			type: "invalid_request_error" as const,
			code: "slug_conflict" as const,
			message: error.message,
		}),
	},
)

// 401 Unauthorized - code: "unauthorized"
export const AttioUnauthorizedErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(401),
		type: Schema.Literal("auth_error"),
		code: Schema.Literal("unauthorized"),
		message: Schema.String,
	}),
	AttioUnauthorizedError,
	{
		decode: (attioError) =>
			new AttioUnauthorizedError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 401 as const,
			type: "auth_error" as const,
			code: "unauthorized" as const,
			message: error.message,
		}),
	},
)

// 403 Forbidden - code: "billing_error"
export const AttioForbiddenErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(403),
		type: Schema.Literal("auth_error"),
		code: Schema.Literal("billing_error"),
		message: Schema.String,
	}),
	AttioForbiddenError,
	{
		decode: (attioError) =>
			new AttioForbiddenError({
				message: attioError.message,
				code: attioError.code,
			}),
		encode: (error) => ({
			status_code: 403 as const,
			type: "auth_error" as const,
			code: error.code as "billing_error",
			message: error.message,
		}),
	},
)

// 429 Rate Limit - code can vary
export const AttioRateLimitErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(429),
		type: Schema.Literal("rate_limit_error"),
		code: Schema.String,
		message: Schema.String,
		retry_after: HttpDate,
	}),
	AttioRateLimitError,
	{
		decode: (attioError) => {
			return new AttioRateLimitError({
				message: attioError.message,
				retryAfter: attioError.retry_after,
			})
		},
		encode: (error) => ({
			status_code: 429 as const,
			type: "rate_limit_error" as const,
			code: "rate_limit_exceeded",
			message: error.message,
			retry_after: error.retryAfter,
		}),
	},
)

// helper to map ResponseError to specific attio errors
export const mapAttioErrors = <
	S extends Schema.ConstraintDecoder<unknown, never>,
	Schemas extends [S, ...Array<S>],
>(
	...errorSchemas: Schemas
) => {
	const [first, ...rest] = errorSchemas
	const schema = rest.length === 0 ? first : Schema.Union(errorSchemas)

	type MappedError = Schemas[number]["Type"]

	return <A, E, R>(
		effect: Effect.Effect<A, E | HttpClientError.HttpClientError, R>,
	): Effect.Effect<A, E | MappedError, R> =>
		effect.pipe(
			Effect.catchIf(HttpClientError.isHttpClientError, (error) => {
				if (error.response === undefined) return Effect.fail(error)

				return error.response.json.pipe(
					Effect.flatMap((json: unknown) =>
						Schema.decodeUnknownEffect(schema)(json).pipe(
							Effect.catch(() => Effect.die(error)),
						),
					),
					Effect.flatMap(Effect.fail),
				)
			}),
		)
}
