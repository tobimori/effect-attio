import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import {
	HttpClient,
	type HttpClientRequest,
	HttpClientResponse,
} from "effect/http"
import { AttioHttpClient } from "../src/http-client.js"
import { AttioTasks } from "../src/services/tasks.js"

const workspaceId = "11111111-1111-4111-8111-111111111111"
const memberId = "44444444-4444-4444-8444-444444444444"
const recordId = "33333333-3333-4333-8333-333333333333"

const task = {
	id: { workspace_id: workspaceId, task_id: "task-1" },
	content_plaintext: "Call back",
	deadline_at: null,
	is_completed: false,
	created_at: "2025-01-02T03:04:05.000Z",
	created_by_actor: { type: "system", id: null },
	assignees: [
		{
			referenced_actor_type: "workspace-member",
			referenced_actor_id: memberId,
		},
	],
	linked_records: [],
}

const requests: Array<HttpClientRequest.HttpClientRequest> = []

const layer = AttioTasks.layer.pipe(
	Layer.provide(AttioHttpClient.layer({ apiKey: Redacted.make("test") })),
	Layer.provide(
		Layer.succeed(
			HttpClient.HttpClient,
			HttpClient.make((request) =>
				Effect.sync(() => {
					requests.push(request)
					return HttpClientResponse.fromWeb(
						request,
						new Response(JSON.stringify({ data: task }), {
							status: 200,
							headers: { "content-type": "application/json" },
						}),
					)
				}),
			),
		),
	),
)

const sentAssignees = (
	request: HttpClientRequest.HttpClientRequest | undefined,
) => {
	if (request?.body._tag !== "Uint8Array") return undefined
	return JSON.parse(new TextDecoder().decode(request.body.body)).data.assignees
}

describe("tasks", () => {
	it.effect("creates a task assigned by workspace member email", () =>
		Effect.gen(function* () {
			const tasks = yield* AttioTasks
			yield* tasks.create({
				content: "Call back",
				format: "plaintext",
				is_completed: false,
				linked_records: [
					{ target_object: "people", target_record_id: recordId },
				],
				assignees: [{ workspace_member_email_address: "rep@example.com" }],
			})
			expect(sentAssignees(requests.at(-1))).toEqual([
				{ workspace_member_email_address: "rep@example.com" },
			])
		}).pipe(Effect.provide(layer)),
	)

	it.effect("reassigns a task by workspace member email", () =>
		Effect.gen(function* () {
			const tasks = yield* AttioTasks
			yield* tasks.update("task-1", {
				assignees: [{ workspace_member_email_address: "rep@example.com" }],
			})
			expect(sentAssignees(requests.at(-1))).toEqual([
				{ workspace_member_email_address: "rep@example.com" },
			])
		}).pipe(Effect.provide(layer)),
	)
})
