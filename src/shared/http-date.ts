import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import * as SchemaTransformation from "effect/SchemaTransformation"

// HTTP Date format parser (RFC 7231)
// Parses dates like "Fri, 15 Aug 2025 11:46:34 GMT"
export const HttpDate = Schema.String.pipe(
	Schema.decodeTo(
		Schema.DateTimeUtc,
		SchemaTransformation.transformOrFail({
			decode: (value, options) =>
				DateTime.make(value).pipe(
					Option.match({
						onNone: () =>
							Effect.fail(
								new SchemaIssue.InvalidValue(
									{
										message: `Unable to parse HTTP date "${value}"`,
									},
									value,
									options,
								),
							),
						onSome: Effect.succeed,
					}),
				),
			encode: (dateTime) => {
				// convert DateTime back to HTTP date format
				const date = DateTime.toDate(dateTime)
				return Effect.succeed(date.toUTCString())
			},
		}),
	),
)
