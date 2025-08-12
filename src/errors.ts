import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
	"@effect-attio/NotFoundError",
	{
		message: Schema.String,
	},
) {}

export class ValidationError extends Schema.TaggedError<ValidationError>()(
	"@effect-attio/ValidationError",
	{
		message: Schema.String,
		errors: Schema.Array(
			Schema.Struct({
				code: Schema.String,
				path: Schema.Array(Schema.Union(Schema.String, Schema.Number)),
				message: Schema.String,
			}),
		),
	},
) {}

export class ConflictError extends Schema.TaggedError<ConflictError>()(
	"@effect-attio/ConflictError",
	{
		message: Schema.String,
		code: Schema.String,
	},
) {}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
	"@effect-attio/UnauthorizedError",
	{
		message: Schema.String,
	},
) {}

export class RateLimitError extends Schema.TaggedError<RateLimitError>()(
	"@effect-attio/RateLimitError",
	{
		message: Schema.String,
		retryAfter: Schema.optional(Schema.Number),
	},
) {}

export const NotFoundErrorSchema = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(404),
		type: Schema.String,
		code: Schema.Literal("not_found"),
		message: Schema.String,
	}),
	NotFoundError,
	{
		strict: true,
		decode: (attioError) =>
			new NotFoundError({
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

export const ValidationErrorSchema = Schema.transform(
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
	ValidationError,
	{
		strict: true,
		decode: (attioError) =>
			new ValidationError({
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

export const ConflictErrorSchema = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(409),
		type: Schema.Literal("invalid_request_error"),
		code: Schema.String,
		message: Schema.String,
	}),
	ConflictError,
	{
		strict: true,
		decode: (attioError) =>
			new ConflictError({
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

export const UnauthorizedErrorSchema = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(401),
		type: Schema.Literal("authentication_error"),
		code: Schema.String,
		message: Schema.String,
	}),
	UnauthorizedError,
	{
		strict: true,
		decode: (attioError) =>
			new UnauthorizedError({
				message: attioError.message,
			}),
		encode: (error) => ({
			status_code: 401 as const,
			type: "authentication_error" as const,
			code: "unauthorized",
			message: error.message,
		}),
	},
)

export const RateLimitErrorSchema = Schema.transform(
	Schema.Struct({
		status_code: Schema.Literal(429),
		type: Schema.Literal("rate_limit_error"),
		code: Schema.String,
		message: Schema.String,
		retry_after: Schema.optional(Schema.Number),
	}),
	RateLimitError,
	{
		strict: true,
		decode: (attioError) =>
			new RateLimitError({
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

// All possible Attio API errors
export const AttioErrorSchema = Schema.Union(
	NotFoundErrorSchema,
	ValidationErrorSchema,
	ConflictErrorSchema,
	UnauthorizedErrorSchema,
	RateLimitErrorSchema,
)

// Union type of all errors
export type AttioErrors =
	| NotFoundError
	| ValidationError
	| ConflictError
	| UnauthorizedError
	| RateLimitError

// Type helper to filter error types
export type WithErrors<T, E extends AttioErrors> = Effect.Effect<T, E>

import type * as HttpClientError from "@effect/platform/HttpClientError"

// Helper to map ResponseError to specific Attio errors
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
