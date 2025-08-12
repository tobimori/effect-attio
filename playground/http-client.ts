import { FetchHttpClient } from "@effect/platform"
import { Effect, Layer } from "effect"
import { AttioHttpClient } from "../src/http-client.js"

const program = Effect.gen(function* () {
	const client = yield* AttioHttpClient
	const response = yield* client.get("/v2/self")

	return yield* response.json
}).pipe(
	Effect.provide(
		AttioHttpClient.layerConfig.pipe(Layer.provide(FetchHttpClient.layer)),
	),
)

Effect.runPromise(program.pipe(Effect.tap((val) => Effect.log(val))))
