import { AttioClient } from "effect-attio"
import { describe, expect, it } from "tstyche"

class DisabledStandardReferencesClient extends AttioClient<DisabledStandardReferencesClient>()(
	"effect-attio/test/DisabledStandardReferencesClient",
	{
		objects: {
			companies: true,
		},
	},
) {}

declare const client: DisabledStandardReferencesClient["Service"]

describe("Disabled standard references", () => {
	it("omits references to objects that are not enabled", () => {
		expect<
			Parameters<typeof client.companies.create>[0]
		>().type.not.toHaveProperty("associated_deals")
		expect<
			Parameters<typeof client.people.create>[0]
		>().type.not.toHaveProperty("associated_users")
	})
})
