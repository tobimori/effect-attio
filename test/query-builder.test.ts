import * as DateTime from "effect/DateTime"
import { describe, expect, test } from "vitest"
import * as Attributes from "../src/schemas/attributes.js"
import { compileQueryBuilderOptions } from "../src/shared/query-builder.js"

const companyFields = {
	domains: Attributes.Domain.Multiple,
	name: Attributes.Text,
}

const invoiceFields = {
	amount: Attributes.Currency.Required,
	company: Attributes.CompanyRecordReference,
	created_at: Attributes.Timestamp.ReadOnlyOptional,
	first_interaction: Attributes.Interaction.ReadOnlyOptional,
	invoice_date: Attributes.Date,
	invoice_number: Attributes.Text.Required,
}

const objectFields = { companies: companyFields }

describe("compileQueryBuilderOptions", () => {
	test("compiles a query builder expression to Attio query parameters", () => {
		const query = compileQueryBuilderOptions<typeof invoiceFields>({
			where: (invoice, { and, eq, gte, not, startsWith }) =>
				and(
					startsWith(invoice.invoice_number, "INV-"),
					gte(invoice.amount, 1000),
					eq(
						invoice.company.target_record_id,
						"550e8400-e29b-41d4-a716-446655440000",
					),
					not(startsWith(invoice.invoice_number, "VOID-")),
				),
			orderBy: (invoice, { asc, desc }) => [
				desc(invoice.amount),
				asc(invoice.invoice_number),
			],
			limit: 50,
		})

		expect(query).toEqual({
			filter: {
				$and: [
					{ invoice_number: { $starts_with: "INV-" } },
					{ amount: { $gte: 1000 } },
					{
						company: {
							target_record_id: {
								$eq: "550e8400-e29b-41d4-a716-446655440000",
							},
						},
					},
					{ $not: { invoice_number: { $starts_with: "VOID-" } } },
				],
			},
			sorts: [
				{ attribute: "amount", direction: "desc" },
				{ attribute: "invoice_number", direction: "asc" },
			],
			limit: 50,
			offset: undefined,
		})
	})

	test("compiles typed relationship filters and sorts to Attio paths", () => {
		const personFields = {
			company: Attributes.CompanyRecordReference,
		}
		const query = compileQueryBuilderOptions<
			typeof personFields,
			typeof objectFields
		>(
			{
				where: (person, { contains }) =>
					contains(person.company.attributes.domains.root_domain, "attio.com"),
				orderBy: (person, { asc }) => asc(person.company.attributes.name),
			},
			{
				resource: "people",
				fields: personFields,
				objects: {
					companies: {
						fields: companyFields,
					},
				},
			},
		)

		expect(query).toEqual({
			filter: {
				path: [
					["people", "company"],
					["companies", "domains"],
				],
				constraints: {
					root_domain: { $contains: "attio.com" },
				},
			},
			sorts: [
				{
					direction: "asc",
					path: [
						["people", "company"],
						["companies", "name"],
					],
				},
			],
			limit: undefined,
			offset: undefined,
		})
	})

	test("formats Effect DateTime query values for Attio", () => {
		const value = DateTime.makeUnsafe("2025-01-02T03:04:05Z")
		const query = compileQueryBuilderOptions<typeof invoiceFields>(
			{
				where: (invoice, { and, gte, lt }) =>
					and(
						gte(invoice.invoice_date, value),
						lt(invoice.created_at, value),
						gte(invoice.first_interaction.interacted_at, value),
					),
			},
			{
				resource: "invoices",
				fields: invoiceFields,
			},
		)

		expect(query.filter).toEqual({
			$and: [
				{ invoice_date: { $gte: "2025-01-02" } },
				{ created_at: { $lt: "2025-01-02T03:04:05.000Z" } },
				{
					first_interaction: {
						interacted_at: { $gte: "2025-01-02T03:04:05.000Z" },
					},
				},
			],
		})
	})

	test("compiles a list parent filter to an Attio path", () => {
		const entryFields = { title: Attributes.Text }
		const peopleFields = {
			email_addresses: Attributes.EmailAddress.Multiple,
		}
		const listObjectFields = { people: peopleFields }
		const query = compileQueryBuilderOptions<
			typeof entryFields,
			typeof listObjectFields,
			"people"
		>(
			{
				where: (_entry, parent, { contains }) =>
					contains(parent.email_addresses.email_domain, "attio.com"),
			},
			{
				resource: "candidates",
				parentResource: "people",
				fields: entryFields,
				objects: {
					people: {
						fields: peopleFields,
					},
				},
			},
		)

		expect(query.filter).toEqual({
			path: [
				["candidates", "parent_record"],
				["people", "email_addresses"],
			],
			constraints: {
				email_domain: { $contains: "attio.com" },
			},
		})
	})
})
