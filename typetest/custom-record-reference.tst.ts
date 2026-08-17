import type { Effect } from "effect"
import { AttioClient, Attributes } from "effect-attio"
import { describe, expect, it } from "tstyche"

const CustomObjectReference = Attributes.RecordReference.For("custom_objects")

class CustomRecordReferenceClient extends AttioClient<CustomRecordReferenceClient>()(
	"effect-attio/test/CustomRecordReferenceClient",
	{
		objects: {
			invoices: {
				invoiceNumber: Attributes.Text.Required,
				customObject: CustomObjectReference,
				customObjects: CustomObjectReference.Multiple,
			},
		},
	},
) {}

declare const client: CustomRecordReferenceClient["Service"]

const recordId = "550e8400-e29b-41d4-a716-446655440000"

describe("Custom record references", () => {
	it("accepts the configured target object", () => {
		expect(client.invoices.create).type.toBeCallableWith({
			invoiceNumber: "INV-001",
			customObject: recordId,
			customObjects: [
				{
					target_object: "custom_objects",
					target_record_id: recordId,
				},
			],
		})
	})

	it("rejects a different target object", () => {
		expect(client.invoices.create).type.not.toBeCallableWith({
			invoiceNumber: "INV-002",
			customObject: {
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
		type CustomObject = NonNullable<Invoice["values"]["customObject"]>

		expect<CustomObject["target_object"]>().type.toBe<"custom_objects">()
		expect<
			Invoice["values"]["customObjects"][number]["target_object"]
		>().type.toBe<"custom_objects">()
	})
})
