import { FetchHttpClient } from "@effect/platform"
import { Effect, Layer, Redacted } from "effect"
import { AttioClient } from "../src/client.js"
import * as Attributes from "../src/schemas/attributes.js"

// use actual attio schemas for standard objects
class MyAttioClient extends AttioClient<MyAttioClient>()("MyAttioClient", {
	objects: {
		users: true,
		invoices: {
			invoice_number: Attributes.Text.Required,
			download_url: Attributes.Text.Required,
			amount: Attributes.Currency.Required,
		},
	},
}) {}

// comprehensive test program for record api
const program = Effect.gen(function* () {
	const attio = yield* MyAttioClient

	// list existing invoices
	const invoicesList = yield* attio.invoices.list({ limit: 5 })
	yield* Effect.log(`Found ${invoicesList.length} existing invoice records`)

	// create a new invoice
	yield* Effect.log("\nCreating a new invoice...")
	const newInvoice = yield* attio.invoices.create({
		invoice_number: "INV-2024-001",
		download_url: "https://example.com/invoices/INV-2024-001.pdf",
		amount: {
			currency_value: 1500.5,
		},
	})
	yield* Effect.log("Created invoice:", JSON.stringify(newInvoice, null, 2))

	// fetch the created invoice
	yield* Effect.log("\nFetching created invoice by ID...")
	const fetchedInvoice = yield* attio.invoices.get(newInvoice.id.record_id)
	yield* Effect.log(
		`Invoice #${fetchedInvoice.values.invoice_number} - Amount: ${fetchedInvoice.values.amount}`,
	)

	// update the invoice
	yield* Effect.log("\nUpdating invoice amount...")
	const updatedInvoice = yield* attio.invoices.update(newInvoice.id.record_id, {
		amount: {
			currency_value: 1750.25,
		},
	})
	yield* Effect.log(`Updated amount to: ${updatedInvoice.values.amount}`)

	// delete the test invoice
	yield* Effect.log("\nDeleting test invoice...")
	yield* attio.invoices.delete(newInvoice.id.record_id)
	yield* Effect.log("Invoice deleted successfully")
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
