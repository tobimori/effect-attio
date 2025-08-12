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

	// Create a new task
	const newTask = yield* attio.tasks.create({
		content: "Test task from Effect client",
		format: "plaintext",
		deadlineAt: (yield* DateTime.now).pipe(DateTime.addDuration("7 days")),
		isCompleted: false,
		linkedRecords: [],
		assignees: [],
	})
	console.log("Created task:", newTask)

	// Get the task we just created
	const fetchedTask = yield* attio.tasks.get(newTask.id.taskId)
	console.log("Fetched task:", fetchedTask)

	// Update the task - mark it as completed and change deadline
	const updatedTask = yield* attio.tasks.update(newTask.id.taskId, {
		isCompleted: true,
		deadlineAt: (yield* DateTime.now).pipe(DateTime.addDuration("14 days")),
	})
	console.log("Updated task:", updatedTask)

	// Delete the task we just created
	yield* attio.tasks.delete(newTask.id.taskId)
	console.log(`Deleted task ${newTask.id.taskId}`)

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
