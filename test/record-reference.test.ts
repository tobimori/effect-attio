import { describe, expect, test } from "vitest"
import * as Schema from "effect/Schema"
import * as Attributes from "../src/schemas/attributes.js"

const companyId = "11111111-1111-4111-8111-111111111111"
const contractId = "22222222-2222-4222-8222-222222222222"

describe("record reference inputs", () => {
	test("adds the configured target object to record IDs", () => {
		expect(
			Schema.encodeSync(Attributes.CompanyRecordReference.input)(companyId),
		).toEqual({
			target_object: "companies",
			target_record_id: companyId,
		})

		const Contracts = Attributes.RecordReference.For("contracts")
		expect(
			Schema.encodeSync(Contracts.Multiple.input)([
				contractId,
				{ target_record_id: contractId },
			]),
		).toEqual([
			{
				target_object: "contracts",
				target_record_id: contractId,
			},
			{
				target_object: "contracts",
				target_record_id: contractId,
			},
		])
	})

	test("preserves Attio standard-object string shorthands", () => {
		expect(
			Schema.encodeSync(Attributes.CompanyRecordReference.input)("example.com"),
		).toBe("example.com")
		expect(
			Schema.encodeSync(Attributes.PersonRecordReference.input)(
				"person@example.com",
			),
		).toBe("person@example.com")
	})

	test("requires an object target for an unconstrained reference", () => {
		expect(() =>
			Schema.encodeSync(Attributes.RecordReference.input)(contractId as never),
		).toThrow()
	})
})
