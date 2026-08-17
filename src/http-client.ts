import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type * as Redacted from "effect/Redacted"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioRateLimitErrorTransform,
	AttioUnauthorizedErrorTransform,
} from "./error-transforms.js"
import type { AttioRateLimitError, AttioUnauthorizedError } from "./errors.js"

const GlobalErrors = Schema.Union([
	AttioUnauthorizedErrorTransform,
	AttioRateLimitErrorTransform,
])

export interface AttioHttpClientOptions {
	apiKey: Redacted.Redacted<string>
	baseUrl?: string
	retryRateLimits?: boolean
}

const handleErrorResponse = Effect.fn("AttioHttpClient.handleErrorResponse")(
	function* (response: HttpClientResponse.HttpClientResponse) {
		const json = yield* response.json
		const body = Predicate.isObject(json) ? json : {}
		const globalError = Schema.decodeUnknownOption(GlobalErrors)(
			Object.assign({}, body, {
				retry_after: response.headers["retry-after"],
			}),
		)

		if (Option.isSome(globalError)) {
			return yield* globalError.value
		}

		return yield* new HttpClientError.HttpClientError({
			reason: new HttpClientError.StatusCodeError({
				response,
				request: response.request,
				description: "unhandled non 2xx status code",
			}),
		})
	},
)

const rateLimitDelay = Effect.fn("AttioHttpClient.rateLimitDelay")(function* (
	error: AttioRateLimitError,
) {
	const now = yield* DateTime.now

	return Duration.max(
		DateTime.distance(now, error.retryAfter),
		Duration.millis(100),
	)
})

const makeAttioHttpClient = Effect.fn("AttioHttpClient.make")(function* (
	opts: AttioHttpClientOptions,
) {
	return (yield* HttpClient.HttpClient).pipe(
		HttpClient.mapRequest((req) =>
			req.pipe(
				HttpClientRequest.acceptJson,
				HttpClientRequest.prependUrl(opts.baseUrl ?? "https://api.attio.com"),
				HttpClientRequest.bearerToken(opts.apiKey),
			),
		),
		HttpClient.filterOrElse(
			(response) => response.status >= 200 && response.status < 300,
			handleErrorResponse,
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
					Schedule.addDelay(({ input: error }) =>
						Match.value(error).pipe(
							Match.tag("AttioRateLimitError", rateLimitDelay),
							Match.orElse(() => Effect.succeed(Duration.zero)),
						),
					),
					// only continue for rate limit errors
					Schedule.while(({ input: error }) =>
						Match.value(error).pipe(
							Match.tag("AttioRateLimitError", () => true),
							Match.orElse(() => false),
						),
					),
				),
			)
		},
	)
})

export class AttioHttpClient extends Context.Service<
	AttioHttpClient,
	Effect.Success<ReturnType<typeof makeAttioHttpClient>>
>()("effect-attio/AttioHttpClient") {
	static readonly layer = (opts: AttioHttpClientOptions) =>
		Layer.effect(
			AttioHttpClient,
			Effect.map(makeAttioHttpClient(opts), AttioHttpClient.of),
		)

	static readonly layerConfig = Layer.unwrap(
		Effect.gen(function* () {
			const apiKey = yield* Config.redacted("ATTIO_API_KEY")
			const baseUrl = yield* Config.string("ATTIO_BASE_URL").pipe(
				Config.withDefault("https://api.attio.com"),
			)
			return AttioHttpClient.layer({ apiKey, baseUrl })
		}),
	)
}
