import * as DateTime from "effect/DateTime"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"

// HTTP Date format parser (RFC 7231)
// Parses dates like "Fri, 15 Aug 2025 11:46:34 GMT"
export const HttpDate = Schema.transformOrFail(
	Schema.String,
	Schema.DateTimeUtcFromSelf,
	{
		strict: true,
		decode: (str) =>
			ParseResult.try({
				try: () => {
					// parse HTTP date format into DateTime
					const date = new Date(str)
					if (isNaN(date.getTime())) {
						throw new Error(`Invalid HTTP date: ${str}`)
					}
					return DateTime.unsafeFromDate(date)
				},
				catch: (error) =>
					new ParseResult.Type(
						Schema.String.ast,
						str,
						`Unable to parse HTTP date "${str}": ${error}`,
					),
			}),
		encode: (dt) => {
			// convert DateTime back to HTTP date format
			const date = DateTime.toDate(dt)
			return ParseResult.succeed(date.toUTCString())
		},
	},
)