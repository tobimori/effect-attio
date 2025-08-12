import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import { AttioHttpClient } from "../../http-client.js"
import * as Schemas from "./schemas.js"

export type { InactiveToken, TokenInfo, TokenInfoResponse } from "./types.js"

export class AttioMeta extends Effect.Service<AttioMeta>()("AttioMeta", {
	effect: Effect.gen(function* () {
		const http = yield* AttioHttpClient

		return {
			/**
			 * Identify the current access token, the workspace it is linked to, and any permissions it has.
			 */
			identify: Effect.fn("meta.identify")(function* () {
				return yield* HttpClientRequest.get("/v2/self").pipe(
					http.execute,
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(Schemas.TokenInfoResponse),
					),
				)
			}),
		}
	}),
}) {}
