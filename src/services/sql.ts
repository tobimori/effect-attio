import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct } from "../shared/schemas.js"

const SqlInput = Schema.Struct({ sql: Schema.String })
const SqlResult = Schema.Struct({
	rows: Schema.Array(Schema.Record(Schema.String, Schema.Json)),
})

const makeAttioSql = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/** Executes a read query through Attio SQL. This endpoint is in beta. */
		query: Effect.fn("AttioSql.query")(function* (sql: string) {
			const body = yield* Schema.encodeEffect(SqlInput)({ sql })
			return yield* HttpClientRequest.post("/v2/sql").pipe(
				HttpClientRequest.bodyJson(body),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(SqlResult)),
				),
				Effect.map((response) => response.data.rows),
				mapAttioErrors(AttioValidationErrorTransform),
			)
		}),
	}
})

export class AttioSql extends Context.Service<
	AttioSql,
	Effect.Success<typeof makeAttioSql>
>()("effect-attio/services/AttioSql") {
	static readonly layer = Layer.effect(
		AttioSql,
		Effect.map(makeAttioSql, AttioSql.of),
	)
}
