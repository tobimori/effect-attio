import { FetchHttpClient } from "@effect/platform"
import { Effect, Layer, Schema } from "effect"
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
			MyAttioClient.layerConfig.pipe(Layer.provide(FetchHttpClient.layer)),
		),
		Effect.catchAll((error) => Effect.die(error)), // Handle errors
	),
)
	.then(console.log)
	.catch(console.error)
