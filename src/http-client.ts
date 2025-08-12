import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { AttioErrorSchema } from "./errors.js"

export interface AttioHttpClientOptions {
	apiKey: Redacted.Redacted<string>
	baseUrl?: string
}

export class AttioHttpClient extends Effect.Service<AttioHttpClient>()(
	"@effect-attio/AttioHttpClient",
	{
		scoped: Effect.fnUntraced(function* (opts: AttioHttpClientOptions) {
			return (yield* HttpClient.HttpClient).pipe(
				HttpClient.mapRequest((req) =>
					req.pipe(
						HttpClientRequest.acceptJson,
						HttpClientRequest.prependUrl(
							opts.baseUrl ?? "https://api.attio.com",
						),
						HttpClientRequest.bearerToken(opts.apiKey),
					),
				),
				HttpClient.filterOrElse(
					(response) => response.status >= 200 && response.status < 300,
					(response) =>
						response.json.pipe(
							Effect.flatMap(Schema.decodeUnknown(AttioErrorSchema)),
							Effect.flatMap(Effect.fail),
						),
				),
			)
		}),
	},
) {
	get layerConfig() {
		return Layer.unwrapEffect(
			Effect.gen(function* () {
				const apiKey = yield* Config.redacted("ATTIO_API_KEY")
				const baseUrl = yield* Config.string("ATTIO_BASE_URL").pipe(
					Config.withDefault("https://api.attio.com"),
				)
				return AttioHttpClient.Default({ apiKey, baseUrl })
			}),
		)
	}
}
