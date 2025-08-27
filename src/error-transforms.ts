import type * as HttpClientError from "@effect/platform/HttpClientError"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
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

// 404 Not Found - code: "not_found"
export const AttioNotFoundErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(404),
		type: Schema.String,
		code: Schema.Literal("not_found"),
		message: Schema.String,
	}),
	AttioNotFoundError,
	{
		strict: true,
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
export const AttioValidationErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("validation_type"),
		message: Schema.String,
		validation_errors: Schema.Array(
			Schema.Struct({
				code: Schema.String,
				path: Schema.Array(Schema.Union(Schema.String, Schema.Number)),
				message: Schema.String,
				string_validation: Schema.optional(Schema.String),
			}),
		),
	}),
	AttioValidationError,
	{
		strict: true,
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
export const AttioMissingValueErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Union(
			Schema.Literal("missing_value"),
			Schema.Literal("value_not_found"),
		),
		message: Schema.String,
	}),
	AttioMissingValueError,
	{
		strict: true,
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
export const AttioImmutableValueErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("immutable_value"),
		message: Schema.String,
	}),
	AttioImmutableValueError,
	{
		strict: true,
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
export const AttioFilterErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("filter_error"),
		message: Schema.String,
	}),
	AttioFilterError,
	{
		strict: true,
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
export const AttioMultipleMatchErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("multiple_match_results"),
		message: Schema.String,
	}),
	AttioMultipleMatchError,
	{
		strict: true,
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
export const AttioSystemEditErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("system_edit_unauthorized"),
		message: Schema.String,
	}),
	AttioSystemEditError,
	{
		strict: true,
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
export const AttioUniquenessConflictErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(400),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("uniqueness_conflict"),
		message: Schema.String,
	}),
	AttioUniquenessConflictError,
	{
		strict: true,
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
export const AttioConflictErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(409),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.Literal("slug_conflict"),
		message: Schema.String,
	}),
	AttioConflictError,
	{
		strict: true,
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
export const AttioUnauthorizedErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(401),
		type: Schema.Literal("auth_error"),
		code: Schema.Literal("unauthorized"),
		message: Schema.String,
	}),
	AttioUnauthorizedError,
	{
		strict: true,
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
export const AttioForbiddenErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(403),
		type: Schema.Literal("auth_error"),
		code: Schema.Literal("billing_error"),
		message: Schema.String,
	}),
	AttioForbiddenError,
	{
		strict: true,
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
export const AttioRateLimitErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(429),
		type: Schema.Literal("rate_limit_error"),
		code: Schema.String,
		message: Schema.String,
		retry_after: HttpDate,
	}),
	AttioRateLimitError,
	{
		strict: true,
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
	S extends Schema.Schema<any, any, never>,
	Schemas extends [S, ...Array<S>],
>(
	...errorSchemas: Schemas
) => {
	const schema =
		errorSchemas.length === 1
			? errorSchemas[0]!
			: errorSchemas.length === 2
				? Schema.Union(errorSchemas[0]!, errorSchemas[1]!)
				: Schema.Union(
						errorSchemas[0]!,
						errorSchemas[1]!,
						...errorSchemas.slice(2),
					)

	type MappedError = Schema.Schema.Type<Schemas[number]>

	return <A, E extends HttpClientError.ResponseError | any, R>(
		effect: Effect.Effect<A, E, R>,
	): Effect.Effect<
		A,
		Exclude<E, HttpClientError.ResponseError> | MappedError,
		R
	> =>
		Effect.catchTag(effect, "ResponseError" as any, (error: any) =>
			error.response.json.pipe(
				Effect.flatMap(Schema.decodeUnknown(schema)),
				Effect.flatMap(Effect.fail),
				Effect.orElse(() => Effect.die(error)),
			),
		) as any
}
