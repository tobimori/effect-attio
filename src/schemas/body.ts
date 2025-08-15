import type { HttpIncomingMessage } from "@effect/platform/HttpIncomingMessage"
import * as Effect from "effect/Effect"
import type * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"

// this is an ugly hack because somehow the generics inside schemaBodyJson
// break the type inference for requirements
export const schemaBodyJsonNever = <A, I>(
	schema: Schema.Schema<A, I, any>,
	options?: ParseOptions | undefined,
) => {
	const parse = Schema.decodeUnknown(schema, options) as unknown as (
		u: unknown,
		overrideOptions?: ParseOptions,
	) => Effect.Effect<A, ParseResult.ParseError, never>
	return <E>(
		self: HttpIncomingMessage<E>,
	): Effect.Effect<A, E | ParseResult.ParseError, never> =>
		Effect.flatMap(self.json, parse)
}
