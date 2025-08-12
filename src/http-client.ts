import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { RateLimitErrorSchema, UnauthorizedErrorSchema } from "./errors.js"

const GlobalErrorSchema = Schema.Union(
	UnauthorizedErrorSchema,
	RateLimitErrorSchema,
)

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
						Effect.gen(function* () {
							const json = yield* response.json
							const globalError =
								Schema.decodeUnknownOption(GlobalErrorSchema)(json)

							if (Option.isSome(globalError)) {
								return yield* globalError.value
							}

							return yield* new HttpClientError.ResponseError({
								response,
								request: response.request,
								reason: "StatusCode",
								description: "unhandled non 2xx status code",
							})
						}),
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
