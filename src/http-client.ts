import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"

export class AttioHttpClient extends Effect.Service<AttioHttpClient>()(
	"@effect-attio/AttioHttpClient",
	{
		scoped: Effect.fnUntraced(function* (config: {
			apiKey: Redacted.Redacted<string>
			baseUrl?: string
		}) {
			return (yield* HttpClient.HttpClient).pipe(
				HttpClient.mapRequest((req) =>
					req.pipe(
						HttpClientRequest.prependUrl(
							config.baseUrl ?? "https://api.attio.com",
						),
						HttpClientRequest.bearerToken(config.apiKey),
					),
				),
			)
		}),
	},
) {
	static layerConfig = Layer.unwrapEffect(
		Effect.gen(function* () {
			const apiKey = yield* Config.redacted("ATTIO_API_KEY")
			const baseUrl = yield* Config.string("ATTIO_BASE_URL").pipe(
				Config.withDefault("https://api.attio.com"),
			)
			return AttioHttpClient.Default({ apiKey, baseUrl })
		}),
	)
}
