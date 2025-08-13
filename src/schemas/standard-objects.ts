import * as Schema from "effect/Schema"
import * as Fields from "./record-fields.js"

export const CompanySchema = Schema.Struct({
	domains: Fields.Domains,
	name: Fields.Text,
	description: Fields.Text,
	team: Fields.RecordReferences,
	categories: Fields.MultiSelect,
	primary_location: Fields.Location,
	angellist: Fields.Text,
	facebook: Fields.Text,
	instagram: Fields.Text,
	linkedin: Fields.Text,
	twitter: Fields.Text,
	associated_deals: Schema.optional(Fields.RecordReferences), // Only available if Deals activated
	associated_workspaces: Schema.optional(Fields.RecordReferences), // Only available if Workspaces activated
})

export const PersonSchema = Schema.Struct({
	email_addresses: Fields.EmailAddresses,
	name: Fields.PersonalName,
	company: Fields.RecordReference,
	description: Fields.Text,
	job_title: Fields.Text,
	phone_numbers: Fields.PhoneNumbers,
	primary_location: Fields.Location,
	angellist: Fields.Text,
	facebook: Fields.Text,
	instagram: Fields.Text,
	linkedin: Fields.Text,
	twitter: Fields.Text,
	associated_deals: Schema.optional(Fields.RecordReferences), // Only available if Deals activated
	associated_users: Schema.optional(Fields.RecordReferences), // Only available if Users activated
})

export const DealSchema = Schema.Struct({
	name: Fields.Text,
	stage: Fields.Status,
	owner: Fields.ActorReference,
	value: Fields.Currency,
	associated_people: Fields.RecordReferences,
	associated_company: Fields.RecordReference,
})

export const UserSchema = Schema.Struct({
	person: Fields.RecordReference,
	primary_email_address: Fields.Text,
	user_id: Fields.Text,
	workspace: Fields.RecordReferences,
})

export const WorkspaceSchema = Schema.Struct({
	workspace_id: Fields.Text,
	name: Fields.Text,
	users: Fields.RecordReferences,
	company: Fields.RecordReference,
	avatar_url: Fields.Text,
})
