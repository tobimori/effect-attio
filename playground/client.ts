import { FetchHttpClient } from "@effect/platform"
import { DateTime, Effect, Layer, Redacted, Schema } from "effect"
import { AttioClient } from "../src/client.js"

const PersonSchema = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	phone: Schema.optional(Schema.String),
})

const CompanySchema = Schema.Struct({
	name: Schema.String,
	domain: Schema.String,
	employee_count: Schema.optional(Schema.Number),
})

class MyAttioClient extends AttioClient<MyAttioClient>()("MyAttioClient", {
	people: PersonSchema,
	companies: CompanySchema,
}) {}

// Example program
const program = Effect.gen(function* () {
	const attio = yield* MyAttioClient

	// Test meta service - identify the current token
	console.log("--- Testing Meta Service ---")
	const tokenInfo = yield* attio.meta.identify()
	console.log("Token info:", tokenInfo)

	// Test webhooks service
	console.log("\n--- Testing Webhooks Service ---")

	// List existing webhooks
	const existingWebhooks = yield* attio.webhooks.list({ limit: 5 })
	console.log("Existing webhooks:", existingWebhooks)

	// Create a new webhook
	const newWebhook = yield* attio.webhooks.create({
		target_url: "https://webhook.site/e25ab1a9-5489-4fa1-8c3a-1e15cafedc35",
		subscriptions: [
			{ event_type: "record.created" },
			{ event_type: "record.updated" },
		],
	})
	console.log("Created webhook (with secret):", newWebhook)

	// Get the webhook we just created
	const fetchedWebhook = yield* attio.webhooks.get(newWebhook.id.webhook_id)
	console.log("Fetched webhook (no secret):", fetchedWebhook)

	// Update the webhook
	const updatedWebhook = yield* attio.webhooks.update(
		newWebhook.id.webhook_id,
		{
			subscriptions: [
				{ event_type: "record.created" },
				{ event_type: "record.deleted" },
			],
		},
	)
	console.log("Updated webhook:", updatedWebhook)

	// Delete the webhook we created
	// yield* attio.webhooks.delete(newWebhook.id.webhook_id)
	// console.log(`Deleted webhook ${newWebhook.id.webhook_id}`)

	// Create a new task
	const newTask = yield* attio.tasks.create({
		content: "Test task from Effect client",
		format: "plaintext",
		deadline_at: (yield* DateTime.now).pipe(DateTime.addDuration("7 days")),
		is_completed: false,
		linked_records: [],
		assignees: [],
	})
	console.log("Created task:", newTask)

	// Get the task we just created
	const fetchedTask = yield* attio.tasks.get(newTask.id.task_id)
	console.log("Fetched task:", fetchedTask)

	// Update the task - mark it as completed and change deadline
	const updatedTask = yield* attio.tasks.update(newTask.id.task_id, {
		is_completed: true,
		deadline_at: (yield* DateTime.now).pipe(DateTime.addDuration("14 days")),
	})
	console.log("Updated task:", updatedTask)

	// Delete the task we just created
	// yield* attio.tasks.delete(newTask.id.task_id)
	// console.log(`Deleted task ${newTask.id.task_id}`)

	// Test notes service
	console.log("\n--- Testing Notes Service ---")

	// List all notes first to see if any exist
	const existingNotes = yield* attio.notes.list({ limit: 5 })
	console.log("Existing notes:", existingNotes)

	// If we have notes, test with their parent, otherwise skip note creation
	if (existingNotes.length > 0) {
		const firstNote = existingNotes[0]
		console.log("Using parent from existing note:", {
			parent_object: firstNote.parent_object,
			parent_record_id: firstNote.parent_record_id,
		})

		// Create a note using the same parent as an existing note
		const newNote = yield* attio.notes.create({
			parent_object: firstNote.parent_object,
			parent_record_id: firstNote.parent_record_id,
			title: "Test Note from Effect Client",
			content:
				"This is a test note created via the Effect Attio client.\n\nIt supports multiple lines.",
			format: "plaintext",
		})
		console.log("Created note:", newNote)

		// Get the note we just created
		const fetchedNote = yield* attio.notes.get(newNote.id.note_id)
		console.log("Fetched note:", fetchedNote)

		// Delete the note we created
		// yield* attio.notes.delete(newNote.id.note_id)
		// console.log(`Deleted note ${newNote.id.note_id}`)
	} else {
		console.log("No existing notes found, skipping note creation test")
	}

	// Create a person
	const person = yield* attio.people.create({
		name: "John Doe",
		email: "john@example.com",
		phone: "+1234567890",
	})
	console.log("Created person:", person)

	// Create a company
	const company = yield* attio.companies.create({
		name: "Acme Corp",
		domain: "acme.com",
		employee_count: 100,
	})
	console.log("Created company:", company)

	// Get a person by ID
	const fetchedPerson = yield* attio.people.get(person.id)
	console.log("Fetched person:", fetchedPerson)

	// List all people
	const people = yield* attio.people.list({ limit: 10 })
	console.log("People list:", people)

	return { person, company }
})

Effect.runPromise(
	program.pipe(
		Effect.provide(
			MyAttioClient.Default({
				apiKey: Redacted.make(process.env.ATTIO_API_KEY),
			}).pipe(Layer.provide(FetchHttpClient.layer)),
		),
	),
)
	.then(console.log)
	.catch(console.error)
