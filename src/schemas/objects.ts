import * as Attributes from "./attributes.js"
import { OptionalAttribute } from "./helpers.js"

/**
 * # Companies
 *
 * **An object to represent businesses: customers, partners, peers…**
 *
 * The company object is available in every Attio workspace. Companies represent businesses, such as customers, partners, suppliers, etc.
 *
 * When creating a person, a related company record will automatically be generated or matched based on the domain of the person’s email address, but they can also be created manually via the web application or the API.
 *
 * Company records are enriched, which means that Attio will automatically populate additional attributes, and those enriched values cannot be overridden by API users. Additionally, some enriched attributes may be hidden from the API depending on the workspace billing plan.
 *
 * @see https://docs.attio.com/docs/standard-objects/standard-objects-companies
 */
export const companies = {
	domains: Attributes.Domain.Multiple,
	name: Attributes.Text,
	description: Attributes.Text,
	team: Attributes.PersonRecordReference.Multiple,
	categories: Attributes.Select.Multiple,
	primary_location: Attributes.Location,
	angellist: Attributes.Text,
	facebook: Attributes.Text,
	instagram: Attributes.Text,
	linkedin: Attributes.Text,
	twitter: Attributes.Text,
	associated_deals: OptionalAttribute(
		Attributes.DealRecordReference.Multiple as any,
	), // TODO: fix
	associated_users: OptionalAttribute(
		Attributes.UserRecordReference.Multiple as any,
	), // TODO: fix
}

/**
 * # People
 *
 * **An object to represent human beings**
 *
 * The person object is available in every Attio workspace. When creating a person, a related company record will automatically be generated or matched based on the domain of the person’s email address, but they can also be created manually via the web application or the API.
 *
 * Person records are enriched, which means that Attio will automatically populate additional attributes, and those values cannot be overridden by API users. Additionally, some enriched attributes may be hidden from the API depending on the workspace billing plan.
 *
 * @see https://docs.attio.com/docs/standard-objects/standard-objects-people
 */
export const people = {
	email_addresses: Attributes.EmailAddress.Multiple,
	name: Attributes.PersonalName,
	company: Attributes.CompanyRecordReference,
	description: Attributes.Text,
	job_title: Attributes.Text,
	phone_numbers: Attributes.PhoneNumber.Multiple,
	primary_location: Attributes.Location,
	angellist: Attributes.Text,
	facebook: Attributes.Text,
	instagram: Attributes.Text,
	linkedin: Attributes.Text,
	twitter: Attributes.Text,
	associated_deals: OptionalAttribute(
		Attributes.RecordReference.Multiple as any,
	), // TODO: fix
	associated_users: OptionalAttribute(
		Attributes.UserRecordReference.Multiple as any,
	), // TODO: fix
}

/**
 * # Deals
 *
 * **An object to represent deals involving people & companies**
 *
 * The Deal object is available in every Attio workspace, but disabled by default. It can only be activated by a workspace admin, in the objects settings page.
 *
 * @see https://docs.attio.com/docs/standard-objects/standard-objects-deals
 */
export const deals = {
	name: Attributes.Text,
	state: Attributes.Status,
	owner: Attributes.ActorReference,
	value: Attributes.Currency,
	associated_people: Attributes.PersonRecordReference.Multiple,
	associated_company: Attributes.CompanyRecordReference,
}

/**
 * # Users
 *
 * **An object to represent users of your product**
 *
 * The User object is available in every Attio workspace, but disabled by default. It can only be activated by a workspace admin, in the Objects settings page.
 *
 * Users represent a user of your product. They are related to a Person, have an email address, and an ID attribute that is defined by your system. Users are grouped together in Workspaces.
 *
 * @see https://docs.attio.com/docs/standard-objects/standard-objects-users
 */
export const users = {
	person: Attributes.PersonRecordReference,
	primary_email_address: Attributes.EmailAddress,
	user_id: Attributes.Text,
	workspace: Attributes.WorkspaceRecordReference,
}

/**
 * # Workspaces
 *
 * **An object to group users of your product**
 *
 * The Workspace object is available in every Attio workspace, but disabled by default. It can only be activated by a workspace admin, in the Objects settings page.
 *
 * Workspaces represent a grouping of users, or an account, in your product. Workspaces can belong to a company and have multiple users.
 *
 * @see https://docs.attio.com/docs/standard-objects/standard-objects-workspaces
 */
export const workspaces = {
	workspace_id: Attributes.Text,
	name: Attributes.Text,
	users: Attributes.UserRecordReference.Multiple,
	company: Attributes.CompanyRecordReference,
	avatar_Url: Attributes.Text,
}
