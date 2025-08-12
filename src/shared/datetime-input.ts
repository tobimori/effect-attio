import * as DateTime from "effect/DateTime"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"

// datetime input schema - users provide DateTime.Utc, api receives string
export const DateTimeISOString = Schema.transformOrFail(
	Schema.DateTimeUtcFromSelf,
	Schema.String,
	{
		strict: true,
		decode: (dt) => ParseResult.succeed(DateTime.formatIso(dt)),
		encode: (str, _, ast) =>
			ParseResult.try({
				try: () => DateTime.unsafeMake(str),
				catch: () =>
					new ParseResult.Type(
						ast,
						str,
						`Unable to decode ${str} into a DateTime.Utc`,
					),
			}),
	},
)
