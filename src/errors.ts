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
				path: Schema.Array(Schema.String),
				message: Schema.String,
			}),
		),
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
				path: Schema.Array(Schema.String),
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

export const AttioErrorSchema = Schema.Union(
	NotFoundErrorSchema,
	ValidationErrorSchema,
)

export type AttioErrors = NotFoundError | ValidationError
