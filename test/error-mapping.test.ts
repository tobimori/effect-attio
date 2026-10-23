import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { AttioHttpClient } from "../src/http-client.js"
import { AttioRecords } from "../src/services/records.js"

const recordId = "33333333-3333-4333-8333-333333333333"
const schema = { input: Schema.Struct({}), output: Schema.Struct({}) }

const respondingWith = (status: number, body: string, contentType: string) =>
	AttioRecords.layer.pipe(
		Layer.provide(AttioHttpClient.layer({ apiKey: Redacted.make("test") })),
		Layer.provide(
			Layer.succeed(
				HttpClient.HttpClient,
				HttpClient.make((request) =>
					Effect.succeed(
						HttpClientResponse.fromWeb(
							request,
							new Response(body, {
								status,
								headers: { "content-type": contentType },
							}),
						),
					),
				),
			),
		),
	)

const getRecord = Effect.gen(function* () {
	const records = yield* AttioRecords
	return yield* records.get("people", schema, recordId)
})

describe("error mapping", () => {
	it.effect(
		"fails with the HTTP error when a 503 matches no mapped error",
		() =>
			Effect.gen(function* () {
				const error = yield* Effect.flip(getRecord)
				expect(error._tag).toBe("HttpClientError")
				expect(error._tag === "HttpClientError" && error.response?.status).toBe(
					503,
				)
			}).pipe(
				Effect.provide(
					respondingWith(
						503,
						JSON.stringify({ message: "unavailable" }),
						"application/json",
					),
				),
			),
	)

	it.effect("fails with the HTTP error when the error body is not JSON", () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(getRecord)
			expect(error._tag === "HttpClientError" && error.response?.status).toBe(
				502,
			)
		}).pipe(
			Effect.provide(
				respondingWith(502, "<html>Bad gateway</html>", "text/html"),
			),
		),
	)

	it.effect("still maps a documented 404 to AttioNotFoundError", () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(getRecord)
			expect(error._tag).toBe("AttioNotFoundError")
		}).pipe(
			Effect.provide(
				respondingWith(
					404,
					JSON.stringify({
						status_code: 404,
						type: "invalid_request_error",
						code: "not_found",
						message: "Record not found",
					}),
					"application/json",
				),
			),
		),
	)
})
