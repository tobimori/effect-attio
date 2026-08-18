import type { Effect } from "effect"
import { AttioClient, Attributes } from "effect-attio"
import { describe, expect, it } from "tstyche"

const CustomObjectReference = Attributes.RecordReference.For("custom_objects")

class CustomRecordReferenceClient extends AttioClient<CustomRecordReferenceClient>()(
	"effect-attio/test/CustomRecordReferenceClient",
	{
		objects: {
			invoices: {
				invoice_number: Attributes.Text.Required,
				custom_object: CustomObjectReference,
				custom_objects: CustomObjectReference.Multiple,
			},
		},
	},
) {}

declare const client: CustomRecordReferenceClient["Service"]

const recordId = "550e8400-e29b-41d4-a716-446655440000"

describe("Custom record references", () => {
	it("accepts the configured target object", () => {
		expect(client.invoices.create).type.toBeCallableWith({
			invoice_number: "INV-001",
			custom_object: recordId,
			custom_objects: [
				{
					target_object: "custom_objects",
					target_record_id: recordId,
				},
			],
		})
	})

	it("rejects a different target object", () => {
		expect(client.invoices.create).type.not.toBeCallableWith({
			invoice_number: "INV-002",
			custom_object: {
				target_object: "other_objects",
				target_record_id: recordId,
			},
		})
	})

	it("preserves the target in output types", () => {
		type Invoice =
			ReturnType<typeof client.invoices.get> extends Effect.Effect<
				infer Success,
				any,
				any
			>
				? Success
				: never
		type CustomObject = NonNullable<Invoice["values"]["custom_object"]>

		expect<CustomObject["target_object"]>().type.toBe<"custom_objects">()
		expect<
			Invoice["values"]["custom_objects"][number]["target_object"]
		>().type.toBe<"custom_objects">()
	})

	it("preserves the target in query types", () => {
		expect(client.invoices.list).type.toBeCallableWith({
			filter: {
				custom_object: {
					target_object: "custom_objects",
					target_record_id: recordId,
				},
			},
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: {
				custom_object: {
					target_object: "other_objects",
					target_record_id: recordId,
				},
			},
		})

		client.invoices.findMany({
			where: (invoice, { eq }) => {
				expect(eq).type.toBeCallableWith(
					invoice.custom_object.target_object,
					"custom_objects",
				)
				expect(eq).type.not.toBeCallableWith(
					invoice.custom_object.target_object,
					"other_objects",
				)

				return eq(invoice.custom_object.target_object, "custom_objects")
			},
		})
	})
})
