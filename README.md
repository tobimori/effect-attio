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
  lists: {
    // define custom lists with specific attributes
    opportunities: {
      title: Attributes.Text.Required,
      value: Attributes.Currency,
      probability: Attributes.Number,
      expected_close_date: Attributes.Date,
      stage: Attributes.Select.Required,
      notes: Attributes.Text,
    },
  },
}) {}

// create a program using the client
const program = Effect.gen(function* () {
  const attio = yield* MyAttioClient

  // create a new company (or get existing if domain already exists)
  const company = yield* attio.companies.create({
    name: "Acme Corp",
    domains: ["acme.com"],
  }).pipe(
    Effect.catchTag("AttioConflictError", (error) => 
      Effect.gen(function* () {
        yield* Effect.log(`Company already exists: ${error.message}`)
        const existing = yield* attio.companies.list({ 
          filter: { domains: ["acme.com"] } 
        })
        return existing[0]
      })
    )
  )

  // create an invoice linked to the company
  const invoice = yield* attio.invoices.create({
    invoice_number: "INV-2024-001",
    amount: 1500.00,
    due_date: "2024-12-31",
    customer: company.id.record_id,
  })

  // create a new opportunity list entry for the company
  const opportunity = yield* attio.lists.opportunities.create({
    parent_record_id: company.id.record_id,
    parent_object: "companies",
    entry_values: {
      title: "Enterprise Deal Q1 2025",
      value: 50000,
      stage: "negotiation",
    }
  })

  return { company, invoice, opportunity }
})

// run the program with configuration
Effect.runPromise(
  program.pipe(
    Effect.provide(
      MyAttioClient.layerConfig.pipe(Layer.provide(FetchHttpClient.layer))
    )
  )
)
