# Effect Attio SDK

A strongly-typed, schema-driven SDK for the [Attio REST API](https://docs.attio.com/rest-api/overview) based on [Effect](https://effect.website)'s `HttpClient`

This is highly experimental and not yet ready for production use. Lot of the code can be improved, a few API calls are still missing and errors are not fully typed yet. (see issues)

## Installation

```bash
npm install effect-attio effect @effect/platform
# or
pnpm add effect-attio effect @effect/platform
# or
bun add effect-attio effect @effect/platform
```

## Quick Start

```typescript
import { FetchHttpClient } from "@effect/platform"
import { Effect, Layer, Redacted } from "effect"
import { AttioClient, Attributes } from "effect-attio"

// define your attio client with your custom objects and attributes
class MyAttioClient extends AttioClient<MyAttioClient>()("MyAttioClient", {
  objects: {
    // use standard objects with built-in attributes
    companies: true,
    people: true,

    // define custom objects with specific attributes
    invoices: {
      invoice_number: Attributes.Text.Required,
      download_url: Attributes.Text,
      amount: Attributes.Currency.Required,
      due_date: Attributes.Date,
      paid: Attributes.Checkbox,
      customer: Attributes.CompanyRecordReference,
    },
  },
}) {}

// create a program using the client
const program = Effect.gen(function* () {
  const attio = yield* MyAttioClient

  // create a new company
  const company = yield* attio.companies.create({
    name: "Acme Corp",
    domains: ["acme.com"],
  })

  // create an invoice linked to the company
  const invoice = yield* attio.invoices.create({
    invoice_number: "INV-2024-001",
    amount: 1500.00,
    due_date: "2024-12-31",
    customer: company.id.record_id,
  })

  // list people from the company
  const people = yield* attio.people.list({
    filter: {
      company: company.id.record_id
    }
  })

  return { company, invoice, people }
})

// run the program with configuration
Effect.runPromise(
  program.pipe(
    Effect.provide(
      MyAttioClient.layerConfig.pipe(Layer.provide(FetchHttpClient.layer))
    )
  )
)
