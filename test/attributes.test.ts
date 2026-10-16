import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { FetchHttpClient } from "effect/http"
import { AttioAttributes, AttioHttpClient } from "../src/index.js"

const id = "11111111-1111-4111-8111-111111111111"
const attributeId = { workspace_id: id, object_id: id, attribute_id: id }
const baseUrl = "https://api.example.invalid"
const path = "/v2/objects/companies/attributes/category"

describe("attribute update paths", () => {
	it.effect.each([
		{ title: "Medium", segment: "Medium" },
		{ title: id, segment: id },
		{ title: "In Progress", segment: "In%20Progress" },
		{ title: "A/B", segment: "A%2FB" },
		{ title: "A#B", segment: "A%23B" },
		{ title: "A?B", segment: "A%3FB" },
		{ title: "A%2FB", segment: "A%252FB" },
	])(
		"keeps $title in one option or status path segment",
		({ title, segment }) => {
			const option = {
				id: { ...attributeId, option_id: id },
				title: "Renamed",
				is_archived: true,
			}
			const status = {
				...option,
				id: { ...attributeId, status_id: id },
				celebration_enabled: false,
				target_time_in_status: null,
			}
			const requests: Array<string> = []

			return Effect.gen(function* () {
				const attributes = yield* AttioAttributes
				yield* attributes.updateSelectOption(
					"objects",
					"companies",
					"category",
					title,
					{ is_archived: true },
				)
				yield* attributes.updateStatus(
					"objects",
					"companies",
					"category",
					title,
					{ is_archived: true },
				)

				expect(requests).toEqual([
					`${baseUrl}${path}/options/${segment}`,
					`${baseUrl}${path}/statuses/${segment}`,
				])
			}).pipe(
				Effect.provide(
					AttioAttributes.layer.pipe(
						Layer.provide(
							AttioHttpClient.layer({
								apiKey: Redacted.make("test-api-key"),
								baseUrl,
								retryRateLimits: false,
							}),
						),
						Layer.provide(FetchHttpClient.layer),
					),
				),
				Effect.provideService(FetchHttpClient.Fetch, async (input) => {
					const url = new URL(
						input instanceof Request ? input.url : String(input),
					)
					requests.push(url.href)
					return Response.json({
						data: url.pathname.includes("/options/") ? option : status,
					})
				}),
			)
		},
	)
})
