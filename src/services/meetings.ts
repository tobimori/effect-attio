import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { CursorPage, CursorParams } from "../shared/pagination.js"
import {
	Actor,
	DataStruct,
	LinkedRecordReference,
	Uuid,
} from "../shared/schemas.js"
import type {
	ReplaceField,
	ReplaceRequiredField,
} from "../shared/type-utils.js"

const MeetingDateTime = Schema.Struct({
	datetime: Schema.DateTimeUtcFromString,
	timezone: Schema.optional(Schema.NullOr(Schema.String)),
})
const MeetingDateTimeOutput = Schema.Struct({
	datetime: Schema.DateTimeUtcFromString,
	timezone: Schema.NullOr(Schema.String),
})
const MeetingDate = Schema.Struct({ date: Schema.String })
const MeetingTimeOutput = Schema.Union([MeetingDateTimeOutput, MeetingDate])
const ParticipantStatus = Schema.Literals([
	"accepted",
	"tentative",
	"declined",
	"pending",
])

export const Meeting = Schema.Struct({
	id: Schema.Struct({ workspace_id: Uuid, meeting_id: Uuid }),
	title: Schema.String,
	description: Schema.String,
	is_all_day: Schema.Boolean,
	start: MeetingTimeOutput,
	end: MeetingTimeOutput,
	participants: Schema.Array(
		Schema.Struct({
			status: ParticipantStatus,
			is_organizer: Schema.Boolean,
			email_address: Schema.NullOr(Schema.String),
			name: Schema.NullOr(Schema.String),
		}),
	),
	linked_records: Schema.Array(LinkedRecordReference),
	created_at: Schema.DateTimeUtcFromString,
	created_by_actor: Actor,
})

const MeetingCursorParams = CursorParams(200)
const MeetingListFields = {
	...MeetingCursorParams.fields,
	participants: Schema.optional(Schema.String),
	sort: Schema.optional(Schema.Literals(["start_asc", "start_desc"])),
	ends_from: Schema.optional(Schema.NullOr(Schema.DateTimeUtcFromString)),
	starts_before: Schema.optional(Schema.NullOr(Schema.DateTimeUtcFromString)),
	timezone: Schema.optional(Schema.String),
}
export const MeetingListParams = Schema.Union([
	Schema.Struct({
		...MeetingListFields,
		linked_object: Schema.String,
		linked_record_id: Uuid,
	}),
	Schema.Struct({
		...MeetingListFields,
		linked_object: Schema.optional(Schema.Never),
		linked_record_id: Schema.optional(Schema.Never),
	}),
])

const MeetingParticipantFields = {
	is_organizer: Schema.Union([
		Schema.Boolean,
		Schema.Literals(["true", "false"]),
	]),
	status: ParticipantStatus,
}
const MeetingParticipantInput = Schema.Union([
	Schema.Struct({
		...MeetingParticipantFields,
		email_address: Schema.String,
		name: Schema.optional(Schema.String),
	}),
	Schema.Struct({
		...MeetingParticipantFields,
		email_address: Schema.optional(Schema.Never),
		name: Schema.NonEmptyString,
	}),
])
const MeetingInputFields = {
	title: Schema.String.check(Schema.isMaxLength(1000)),
	description: Schema.String.check(Schema.isMaxLength(10000)),
	participants: Schema.Array(MeetingParticipantInput).check(
		Schema.isMaxLength(500),
	),
	linked_records: Schema.optional(
		Schema.Array(
			Schema.Struct({
				object: Schema.String,
				record_id: Uuid,
			}),
		).check(Schema.isMaxLength(50)),
	),
}
export const MeetingInput = Schema.Union([
	Schema.Struct({
		...MeetingInputFields,
		start: MeetingDate,
		end: MeetingDate,
		is_all_day: Schema.Literal(true),
	}),
	Schema.Struct({
		...MeetingInputFields,
		start: MeetingDateTime,
		end: MeetingDateTime,
		is_all_day: Schema.Literal(false),
	}),
])

const CallRecordingId = Schema.Struct({
	workspace_id: Uuid,
	meeting_id: Uuid,
	call_recording_id: Uuid,
})
const CallRecordingStatus = Schema.Literals([
	"processing",
	"completed",
	"failed",
])
const TranscriptSegmentInput = Schema.Struct({
	speech: Schema.String,
	start_time: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
	end_time: Schema.Number,
	speaker: Schema.Struct({
		name: Schema.String,
		email_address: Schema.optional(Schema.String),
	}),
})
const TranscriptSegment = Schema.Struct({
	speech: Schema.String,
	start_time: Schema.Number,
	end_time: Schema.Number,
	speaker: Schema.Struct({ name: Schema.String }),
})

export const CallRecording = Schema.Struct({
	id: CallRecordingId,
	status: CallRecordingStatus,
	web_url: Schema.String,
	created_by_actor: Actor,
	created_at: Schema.DateTimeUtcFromString,
})

export const CallRecordingDetails = Schema.Struct({
	...CallRecording.fields,
	video_url: Schema.NullOr(Schema.String),
	transcript: Schema.NullOr(
		Schema.Struct({
			segments: Schema.Array(TranscriptSegment),
			raw_transcript: Schema.String,
		}),
	),
})

const CallRecordingInput = Schema.Struct({
	video_url: Schema.optional(Schema.String),
	transcript: Schema.optional(
		Schema.Array(TranscriptSegmentInput).check(Schema.isMaxLength(4000)),
	),
})

const makeAttioMeetings = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		list: Effect.fn("AttioMeetings.list")(function* (
			params?: (typeof MeetingListParams)["Type"],
		) {
			const query = yield* Schema.encodeEffect(MeetingListParams)(params ?? {})
			return yield* HttpClientRequest.get("/v2/meetings").pipe(
				HttpClientRequest.appendUrlParams(query),
				http.execute,
				Effect.flatMap(HttpClientResponse.schemaBodyJson(CursorPage(Meeting))),
			)
		}),

		create: Effect.fn("AttioMeetings.create")(function* (
			meeting: (typeof MeetingInput)["Type"],
		) {
			const data = yield* Schema.encodeEffect(MeetingInput)(meeting)
			return yield* HttpClientRequest.post("/v2/meetings").pipe(
				HttpClientRequest.bodyJson({ data }),
				Effect.flatMap(http.execute),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Meeting))),
				Effect.map((response) => response.data),
				mapAttioErrors(AttioValidationErrorTransform),
			)
		}),

		get: Effect.fn("AttioMeetings.get")(function* (meetingId: string) {
			return yield* http.get(`/v2/meetings/${meetingId}`).pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Meeting))),
				Effect.map((response) => response.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),

		listCallRecordings: Effect.fn("AttioMeetings.listCallRecordings")(
			function* (
				meetingId: string,
				params?: (typeof MeetingCursorParams)["Type"],
			) {
				const query = yield* Schema.encodeEffect(MeetingCursorParams)(
					params ?? {},
				)
				return yield* HttpClientRequest.get(
					`/v2/meetings/${meetingId}/call_recordings`,
				).pipe(
					HttpClientRequest.appendUrlParams(query),
					http.execute,
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(CursorPage(CallRecording)),
					),
					mapAttioErrors(AttioNotFoundErrorTransform),
				)
			},
		),

		createCallRecording: Effect.fn("AttioMeetings.createCallRecording")(
			function* (
				meetingId: string,
				callRecording: (typeof CallRecordingInput)["Type"],
			) {
				const data =
					yield* Schema.encodeEffect(CallRecordingInput)(callRecording)
				return yield* HttpClientRequest.post(
					`/v2/meetings/${meetingId}/call_recordings`,
				).pipe(
					HttpClientRequest.bodyJson({ data }),
					Effect.flatMap(http.execute),
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(DataStruct(CallRecording)),
					),
					Effect.map((response) => response.data),
					mapAttioErrors(
						AttioValidationErrorTransform,
						AttioNotFoundErrorTransform,
					),
				)
			},
		),

		getCallRecording: Effect.fn("AttioMeetings.getCallRecording")(function* (
			meetingId: string,
			callRecordingId: string,
		) {
			return yield* http
				.get(`/v2/meetings/${meetingId}/call_recordings/${callRecordingId}`)
				.pipe(
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(DataStruct(CallRecordingDetails)),
					),
					Effect.map((response) => response.data),
					mapAttioErrors(AttioNotFoundErrorTransform),
				)
		}),

		deleteCallRecording: Effect.fn("AttioMeetings.deleteCallRecording")(
			function* (meetingId: string, callRecordingId: string) {
				yield* http
					.del(`/v2/meetings/${meetingId}/call_recordings/${callRecordingId}`)
					.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
			},
		),
	}
})

export class AttioMeetings extends Context.Service<
	AttioMeetings,
	Effect.Success<typeof makeAttioMeetings>
>()("effect-attio/services/AttioMeetings") {
	static readonly layer = Layer.effect(
		AttioMeetings,
		Effect.map(makeAttioMeetings, AttioMeetings.of),
	)
}

type MeetingLinkedRecord = NonNullable<
	(typeof MeetingInput)["Type"]["linked_records"]
>[number]

type ConfiguredMeetingInput<TObjectName extends string> = ReplaceField<
	(typeof MeetingInput)["Type"],
	"linked_records",
	| ReadonlyArray<ReplaceField<MeetingLinkedRecord, "object", TObjectName>>
	| undefined
>

export type GenericAttioMeetings<TObjectName extends string> = Omit<
	AttioMeetings["Service"],
	"list" | "create"
> & {
	list: (
		params?: ReplaceRequiredField<
			NonNullable<Parameters<AttioMeetings["Service"]["list"]>[0]>,
			"linked_object",
			TObjectName
		>,
	) => ReturnType<AttioMeetings["Service"]["list"]>
	create: (
		meeting: ConfiguredMeetingInput<TObjectName>,
	) => ReturnType<AttioMeetings["Service"]["create"]>
}
