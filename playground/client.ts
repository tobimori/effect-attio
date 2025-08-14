import { FetchHttpClient } from "@effect/platform"
import { Effect, Layer, Redacted } from "effect"
import { AttioClient } from "../src/client.js"

// use actual attio schemas for standard objects
class MyAttioClient extends AttioClient<MyAttioClient>()("MyAttioClient", {
	objects: {
		users: true,
		workspaces: true,
	},
}) {}

// comprehensive test program for record api
const program = Effect.gen(function* () {
	const attio = yield* MyAttioClient

	yield* Effect.log("=== Testing Record API ===")

	// test list operation
	yield* Effect.log("\n1. Listing people...")
	const peopleList = yield* attio.people.list({ limit: 5 })
	yield* Effect.log(`Found ${peopleList.length} people records`)
	if (peopleList.length > 0) {
		yield* Effect.log("First person:", JSON.stringify(peopleList[0], null, 2))
	}

	// test list with pagination
	yield* Effect.log("\n2. Testing pagination...")
	const page1 = yield* attio.companies.list({ limit: 2, offset: 0 })
	const page2 = yield* attio.companies.list({ limit: 2, offset: 2 })
	yield* Effect.log(
		`Page 1: ${page1.length} companies, Page 2: ${page2.length} companies`,
	)

	// test create/update/delete operations
	yield* Effect.log("\n3. Testing CRUD operations...")
	const crudTests = Effect.gen(function* () {
		const newPerson = yield* attio.people.create({
			name: {
				first_name: "Test",
				last_name: "User",
				full_name: "Test User",
			},
			email_addresses: [{ email_address: "test@example.com" }],
		})
		yield* Effect.log("Created person:", JSON.stringify(newPerson, null, 2))

		// test get operation
		yield* Effect.log("\n4. Fetching created person by ID...")
		const fetchedPerson = yield* attio.people.get(newPerson.id.record_id)
		yield* Effect.log("Fetched person:", JSON.stringify(fetchedPerson, null, 2))

		// test update operation
		yield* Effect.log("\n5. Updating person...")
		const updatedPerson = yield* attio.people.update(newPerson.id.record_id, {
			job_title: "Software Engineer",
		})
		yield* Effect.log("Updated job title:", updatedPerson.job_title)

		// test patch operation
		yield* Effect.log("\n6. Patching person...")
		const patchedPerson = yield* attio.people.patch(newPerson.id.record_id, {
			description: "Test user created via API",
		})
		yield* Effect.log("Patched description:", patchedPerson.description)

		// test assert operation
		yield* Effect.log("\n7. Testing assert operation...")
		const assertedPerson = yield* attio.people.assert("email_addresses", {
			email_addresses: [{ email_address: "test@example.com" }],
			job_title: "Senior Software Engineer",
		})
		yield* Effect.log(
			"Asserted person (should update existing):",
			assertedPerson.job_title,
		)

		// test list attribute values
		yield* Effect.log("\n8. Listing attribute values...")
		const attributeValues = yield* attio.people.listAttributeValues(
			newPerson.id.record_id,
			"email_addresses",
			{ show_historic: true },
		)
		yield* Effect.log(
			"Email attribute values:",
			JSON.stringify(attributeValues, null, 2),
		)

		// test delete operation
		yield* Effect.log("\n9. Deleting person...")
		yield* attio.people.delete(newPerson.id.record_id)
		yield* Effect.log("Person deleted successfully")
	})

	yield* crudTests.pipe(
		Effect.catchAll((error) =>
			Effect.log("Error during CRUD operations:", error),
		),
	)

	// test workspace and user objects if they exist
	yield* Effect.log("\n10. Testing workspaces and users...")
	const workspaceTests = Effect.gen(function* () {
		const workspacesList = yield* attio.workspaces.list({ limit: 5 })
		yield* Effect.log(`Found ${workspacesList.length} workspace records`)

		const usersList = yield* attio.users.list({ limit: 5 })
		yield* Effect.log(`Found ${usersList.length} user records`)
	})

	yield* workspaceTests.pipe(
		Effect.catchAll(() =>
			Effect.log(
				"Workspaces/Users might not be enabled in your Attio workspace",
			),
		),
	)

	return "\n=== All tests complete ==="
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
