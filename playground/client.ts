import { FetchHttpClient } from "@effect/platform"
import { Effect, Layer, Redacted, Schema } from "effect"
import { AttioClient } from "../src/client.js"
import * as Fields from "../src/schemas/record-fields.js"
import { CompanySchema, PersonSchema } from "../src/schemas/standard-objects.js"

// Use the actual Attio schemas for standard objects
class MyAttioClient extends AttioClient<MyAttioClient>()("MyAttioClient", {
	people: PersonSchema,
	companies: CompanySchema,
	// Add a custom object for testing
	projects: Schema.Struct({
		name: Fields.Text,
		status: Fields.SelectWith("planning", "active", "completed", "on_hold"),
		budget: Fields.Currency,
		owner: Fields.RecordReference,
		company: Fields.RecordReference,
		start_date: Fields.Date,
		team_members: Fields.RecordReferences,
	}),
}) {}

// Test program - just test the get operation
const program = Effect.gen(function* () {
	const attio = yield* MyAttioClient

	// Test getting a person record
	// Replace with a real record ID from your Attio workspace
	const personId = "fb59b1f4-348a-4732-8cc6-aa9bee941d01"
	console.log(`\nFetching person with ID: ${personId}`)

	const person = yield* attio.people.get(personId)
	console.log("Person record:", JSON.stringify(person, null, 2))

	// Test getting a company record
	// Replace with a real record ID from your Attio workspace
	const companyId = "ec154696-e345-4166-bd5a-665d2acaf1e5"
	console.log(`\nFetching company with ID: ${companyId}`)

	const company = yield* attio.companies.get(companyId)
	console.log("Company record:", JSON.stringify(company, null, 2))

	return "Test complete"
})

Effect.runPromise(
	program.pipe(
		Effect.provide(
			MyAttioClient.Default({
				apiKey: Redacted.make(process.env.ATTIO_API_KEY || ""),
			}).pipe(Layer.provide(FetchHttpClient.layer)),
		),
	),
)
	.then(console.log)
	.catch(console.error)
