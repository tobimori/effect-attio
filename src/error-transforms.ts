import type * as HttpClientError from "@effect/platform/HttpClientError"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
	AttioConflictError,
	AttioNotFoundError,
	AttioRateLimitError,
	AttioUnauthorizedError,
	AttioValidationError,
} from "./errors.js"

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

export const AttioConflictErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(409),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.String,
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
			code: error.code,
			message: error.message,
		}),
	},
)

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

export const AttioRateLimitErrorTransform = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(429),
		type: Schema.Literal("rate_limit_error"),
		code: Schema.String,
		message: Schema.String,
		retry_after: Schema.optional(Schema.Number),
	}),
	AttioRateLimitError,
	{
		strict: true,
		decode: (attioError) =>
			new AttioRateLimitError({
				message: attioError.message,
				retryAfter: attioError.retry_after,
			}),
		encode: (error) => ({
			status_code: 429 as const,
			type: "rate_limit_error" as const,
			code: "rate_limit_exceeded",
			message: error.message,
			retry_after: error.retryAfter,
		}),
	},
)

// all possible attio api errors
export const AttioErrorTransform = Schema.Union(
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	AttioConflictErrorTransform,
	AttioUnauthorizedErrorTransform,
	AttioRateLimitErrorTransform,
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
