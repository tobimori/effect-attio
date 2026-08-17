import { AttioClient } from "effect-attio"
import { describe, expect, it } from "tstyche"

class EnabledStandardReferencesClient extends AttioClient<EnabledStandardReferencesClient>()(
	"effect-attio/test/EnabledStandardReferencesClient",
	{
		objects: {
			deals: true,
			users: true,
		},
	},
) {}

declare const client: EnabledStandardReferencesClient["Service"]

const recordId = "550e8400-e29b-41d4-a716-446655440000"

describe("Enabled standard references", () => {
	it("includes references to explicitly enabled objects", () => {
		expect<Parameters<typeof client.companies.create>[0]>().type.toHaveProperty(
			"associated_deals",
		)
		expect<Parameters<typeof client.people.create>[0]>().type.toHaveProperty(
			"associated_users",
		)
		expect(client.companies.create).type.toBeCallableWith({
			associated_deals: [recordId],
			associated_users: [recordId],
		})
		expect(client.people.create).type.toBeCallableWith({
			associated_deals: [recordId],
			associated_users: [recordId],
		})
	})
})
