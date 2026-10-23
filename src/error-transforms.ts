import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SchemaTransformation from "effect/SchemaTransformation"
import * as HttpClientError from "effect/http/HttpClientError"
import {
	AttioConflictError,
	AttioFilterError,
	AttioForbiddenError,
	AttioImmutableValueError,
	AttioInvalidRequestError,
	AttioMissingValueError,
	AttioMultipleMatchError,
	AttioNotFoundError,
	AttioPaymentRequiredError,
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

// Errors are classified by code and not by HTTP status, so that each Attio code
// maps to one error class

// 404 or 400 - code: "not_found" or "value_not_found"
export const AttioNotFoundErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literals([400, 404]),
		type: Schema.String,
		code: Schema.Literals(["not_found", "value_not_found"]),
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

// 400 Bad Request - code: "validation_type", with a validation_errors array
// only when the request body fails the schema check
export const AttioValidationErrorTransform = transformAttioError(
	Schema.Struct({
		// 413 when the request body is too large
		status_code: Schema.Literals([400, 413]),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("validation_type"),
		message: Schema.String,
		validation_errors: Schema.optional(
			Schema.Array(
				Schema.Struct({
					code: Schema.String,
					path: Schema.Array(Schema.Union([Schema.String, Schema.Number])),
					message: Schema.String,
					string_validation: Schema.optional(Schema.String),
				}),
			),
		),
	}),
	AttioValidationError,
	{
		decode: (attioError) =>
			new AttioValidationError({
				message: attioError.message,
				errors: (attioError.validation_errors ?? []).map((err) => ({
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

// 400 Bad Request - code: "missing_value"
export const AttioMissingValueErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("missing_value"),
		message: Schema.String,
	}),
	AttioMissingValueError,
	{
		decode: (attioError) =>
			new AttioMissingValueError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 400 as const,
			type: "invalid_request_error" as const,
			code: "missing_value" as const,
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

// 400 Bad Request - code: "filter_error", or "invalid_filter_operator" for an
// operator that the attribute does not support
export const AttioFilterErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literals(["filter_error", "invalid_filter_operator"]),
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

// 400 or 409 - code: "multiple_match_results"
export const AttioMultipleMatchErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literals([400, 409]),
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

// 400 or 409 - code: "uniqueness_conflict"
export const AttioUniquenessConflictErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literals([400, 409]),
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

// 409 Conflict - code: "slug_conflict" or "concurrent_write_conflict"
export const AttioConflictErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(409),
		type: Schema.Literal("invalid_request_error"),
		code: AttioConflictError.fields.code,
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
			code: error.code,
			message: error.message,
		}),
	},
)

// 400 Bad Request (or 404 for "merge_in_progress") - other invalid requests
export const AttioInvalidRequestErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literals([400, 404]),
		type: Schema.Literal("invalid_request_error"),
		code: AttioInvalidRequestError.fields.code,
		message: Schema.String,
	}),
	AttioInvalidRequestError,
	{
		decode: (attioError) =>
			new AttioInvalidRequestError({
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

// 402 Payment Required - no type or code
export const AttioPaymentRequiredErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(402),
		message: Schema.String,
	}),
	AttioPaymentRequiredError,
	{
		decode: (attioError) =>
			new AttioPaymentRequiredError({ message: attioError.message }),
		encode: (error) => ({
			status_code: 402 as const,
			message: error.message,
		}),
	},
)

// 403 Forbidden - code: "unauthorized" (missing scope), "billing_error" or
// "quota_exceeded"
export const AttioForbiddenErrorTransform = transformAttioError(
	Schema.Struct({
		status_code: Schema.Literal(403),
		type: Schema.Literal("auth_error"),
		code: Schema.String,
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
			code: error.code,
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
	): Effect.Effect<A, E | MappedError | HttpClientError.HttpClientError, R> =>
		effect.pipe(
			Effect.catchIf(HttpClientError.isHttpClientError, (error) => {
				if (error.response === undefined) return Effect.fail(error)

				return error.response.json.pipe(
					Effect.flatMap((json: unknown) =>
						Schema.decodeUnknownEffect(schema)(json).pipe(
							Effect.catch(() => Effect.fail(error)),
						),
					),
					Effect.flatMap(Effect.fail),
				)
			}),
		)
}
