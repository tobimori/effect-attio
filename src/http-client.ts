import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Config from "effect/Config"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import {
	AttioRateLimitErrorTransform,
	AttioUnauthorizedErrorTransform,
} from "./error-transforms.js"
import type { AttioRateLimitError, AttioUnauthorizedError } from "./errors.js"

const GlobalErrors = Schema.Union(
	AttioUnauthorizedErrorTransform,
	AttioRateLimitErrorTransform,
)

export interface AttioHttpClientOptions {
	apiKey: Redacted.Redacted<string>
	baseUrl?: string
	retryRateLimits?: boolean
}

export class AttioHttpClient extends Effect.Service<AttioHttpClient>()(
	"AttioHttpClient",
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
							const globalError = Schema.decodeUnknownOption(GlobalErrors)({
								...(json as { [k: string]: unknown }),
								retry_after: response.headers["retry-after"],
							})

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
				(c) => {
					if (opts.retryRateLimits === false) return c

					return HttpClient.retry(
						c,
						Schedule.identity<
							| HttpClientError.HttpClientError
							| AttioUnauthorizedError
							| AttioRateLimitError
						>().pipe(
							Schedule.addDelayEffect((error) =>
								Match.value(error).pipe(
									Match.tag("AttioRateLimitError", (rateLimitError) =>
										Effect.gen(function* () {
											// calculate delay until retry-after time
											const now = yield* DateTime.now

											return Duration.max(
												DateTime.distance(now, rateLimitError.retryAfter),
												"100 millis",
											)
										}),
									),
									Match.orElse(() => Effect.succeed(Duration.zero)),
								),
							),
							// only continue for rate limit errors
							Schedule.whileInput((error) =>
								Match.value(error).pipe(
									Match.tag("AttioRateLimitError", () => true),
									Match.orElse(() => false),
								),
							),
						),
					)
				},
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
