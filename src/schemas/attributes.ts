import * as Schema from "effect/Schema"
import { DateTimeISOString } from "../shared/datetime-input.js"
import { Actor, ActorType } from "../shared/schemas.js"
import {
	ApiSingleValue,
	BaseAttribute,
	CountryCode,
	CurrencyCode,
} from "./values.js"

export interface AttributeDef {
	input: Schema.Schema.Any
	output: Schema.Schema.Any
}

/**
 * # Actor reference (User)
 *
 * **References to workspace members and others**
 *
 * Actor references are used to link to actors in Attio. You’re most likely to encounter this attribute via the `created_by` attribute which is available on every object, the owner attribute on a deal object, or the `strongest_connection_user` on a company or person.
 *
 * This is the single-select variant of the field.
 *
 * Please note, in the mobile and web clients, attributes of this type are marked as “User” attributes.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-actor-reference
 */
export const ActorReference = {
	/* Currently, the only type of actor that can be explicitly set in our API is "workspace-member". We may expand this list in future. */
	input: Schema.Union(
		Schema.String,
		Schema.Struct({
			workspace_member_email_address: Schema.String,
		}),
		Schema.Struct({
			referenced_actor_type: Schema.Literal("workspace-member"),
			referenced_actor_id: Schema.UUID,
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("actor-reference"),
			referenced_actor_type: ActorType,
			referenced_actor_id: Schema.UUID,
		}),
	),
} satisfies AttributeDef

/**
 * # Actor references (Users)
 *
 * **References to workspace members and others**
 *
 * Actor references are used to link to actors in Attio. You’re most likely to encounter this attribute via the `created_by` attribute which is available on every object, the owner attribute on a deal object, or the `strongest_connection_user` on a company or person.
 *
 * This is the multi-select variant of the field.
 *
 * Please note, in the mobile and web clients, attributes of this type are marked as “User” attributes.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-actor-reference
 */
export const ActorReferences = {
	/* Currently, the only type of actor that can be explicitly set in our API is "workspace-member". We may expand this list in future. */
	input: Schema.Array(ActorReference.input),
	output: Schema.Array(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("actor-reference"),
			referenced_actor_type: ActorType,
			referenced_actor_id: Schema.UUID,
		}),
	),
} satisfies AttributeDef

/**
 * # Checkbox
 *
 * **Modelling boolean values**
 *
 * Checkbox attributes are used to represent boolean values (`true` and `false`). In the UI, they are presented to users as a checkbox, hence the name.
 *
 * There are no predefined checkbox attributes on any of the standard objects. As a result, checkbox attributes will only be present when added by the user.
 *
 * Checkbox attributes may only be single-select.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-checkbox
 */
export const Checkbox = {
	input: Schema.Union(
		Schema.Boolean,
		Schema.Literal("true", "false"),
		Schema.Array(
			Schema.Union(Schema.Boolean, Schema.Literal("true", "false")),
		).pipe(Schema.maxItems(1)),
		Schema.Array(
			Schema.Struct({
				value: Schema.Boolean,
			}),
		).pipe(Schema.maxItems(1)),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("checkbox"),
			value: Schema.Boolean,
		}),
	),
} satisfies AttributeDef

/**
 * # Currency
 *
 * **More than just numbers**
 *
 * Currency attributes represent quantities of money. They are similar to number attributes, allowing storing numbers with up to four decimal places of precision, but are presented differently in the UI with a currency symbol usually alongside.
 *
 * Two examples of currency attributes are the `funding_raised_usd` attribute on the company object, and the `value` attribute on the deal object.
 *
 * There is a `currency_code` property returned from the API on each attribute value, but please note that this is shared among all attribute values of the attribute; it is not possible to override currency for a particular record or entry.
 *
 * Currency attributes can only be single-select.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-currency
 */
export const Currency = {
	input: Schema.Union(
		Schema.Number,
		Schema.String,
		Schema.Struct({
			currency_value: Schema.Union(Schema.Number, Schema.String),
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("currency"),
			currency_value: Schema.NumberFromString,
			currency_code: CurrencyCode,
		}),
	),
} satisfies AttributeDef

/**
 * # Date
 *
 * **A timezone-less calendar date**
 *
 * Date attributes are used to represent a single calendar year, month and day, independent of timezone. Attio exclusively works with the ISO 8601 format, i.e. `YYYY-MM-DD` e.g. `2023-11-24`.
 *
 * There is only one default example of a date attribute, `foundation_date on the company object.
 *
 * Date attributes can only be single-select.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-date
 */
export const Date = {
	input: Schema.Union(
		DateTimeISOString,
		Schema.Struct({
			value: DateTimeISOString,
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("date"),
			value: Schema.DateTimeUtc,
		}),
	),
} satisfies AttributeDef

/**
 * # Domains
 *
 * **An internet domain**
 *
 * Domain attributes represent an internet domain, for example, “apple.com”.
 *
 * Attio represents domains as structured objects rather than raw strings, allowing filtering and display of specific domain properties such as the root domain.
 *
 * Please note that domain attributes store domains, not URLs. Any inputted values will have paths and query parameters trimmed. If you would like to store full URLs, please use a text attribute.
 *
 * It isn’t currently possible to create your own domain attributes, so you’ll find only the multi-select `domains` attribute on a company object.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-domain
 */
export const Domains = {
	input: Schema.Union(
		Schema.String,
		Schema.Struct({
			domain: Schema.String,
		}),
		Schema.Array(
			Schema.Union(
				Schema.String,
				Schema.Struct({
					domain: Schema.String,
				}),
			),
		),
	),
	output: Schema.Array(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("domain"),
			domain: Schema.String,
			root_domain: Schema.String,
		}),
	),
} satisfies AttributeDef

/**
 * # Email address
 *
 * **An email address**
 *
 * Email address attributes are a string referencing an internet email address. For example, an email address might be `"example@example.com"`. Like domain attributes, we do some parsing of the email domain part, as well as validating the general shape of an email address overall.
 *
 * It isn’t currently possible to create your own email address attributes. You’ll find only the multiselect `email_addresses` attribute on a person object, or the single attribute `email_address` attribute on the user standard object.
 *
 * This is the single-select variant of the email address attribute.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-email-address
 */
export const EmailAddress: AttributeDef = {
	input: Schema.Union(
		Schema.String,
		Schema.Struct({
			email_address: Schema.String,
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("email-address"),
			email_address: Schema.String,
			original_email_address: Schema.String,
			email_domain: Schema.String,
			email_root_domain: Schema.String,
			email_local_specifier: Schema.String,
		}),
	),
}

/**
 * # Email addresses
 *
 * **An email address**
 *
 * Email address attributes are a string referencing an internet email address. For example, an email address might be `"example@example.com"`. Like domain attributes, we do some parsing of the email domain part, as well as validating the general shape of an email address overall.
 *
 * It isn’t currently possible to create your own email address attributes. You’ll find only the multiselect `email_addresses` attribute on a person object, or the single attribute `email_address` attribute on the user standard object.
 *
 * This is the multi-select variant of the email address attribute.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-email-address
 */
export const EmailAddresses: AttributeDef = {
	input: Schema.Array(EmailAddress.input),
	output: Schema.Array(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("email-address"),
			email_address: Schema.String,
			original_email_address: Schema.String,
			email_domain: Schema.String,
			email_root_domain: Schema.String,
			email_local_specifier: Schema.String,
		}),
	),
}

/**
 * # Interaction
 *
 * **Calendar events and emails**
 *
 * Interactions are quite a generic concept, used to model when a given actor interacted with a record in a particular way. Presently, Attio has just two types of interaction:
 * - Email interactions (`first_email_interaction` and `last_email_interaction`)
 * - Calendar interactions (`first_calendar_interaction`, `last_calendar_interaction` and `next_calendar_interaction`)
 *
 * These attributes are available on both the Company and Person objects, although they are enriched and not available on every billing plan. For more information about these attributes, please see our Enriched data help page.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-interaction
 */
export const Interaction = {
	/* It is not currently possible to write Interaction values, they are only created by the Attio system. */
	input: Schema.Void,
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("interaction"),
			interaction_type: Schema.Literal("email", "calendar-event"),
			interacted_at: Schema.DateTimeUtc,
			owner_actor: Actor,
		}),
	),
} satisfies AttributeDef

/**
 * # Location
 * **A physical location in the world**
 *
 * Location attributes model a physical location in the world. We store all location properties (address lines, postcode, country code, etc) on a single attribute value, rather than separate attributes. This means that when working with locations, updates must be atomic—every property must be specified, even if it is null.
 *
 * You’ll find an example of this attribute as `primary_location` on both person and company objects.
 *
 * Locations have the following properties:
 * - `line_1` - the first line of the address, e.g. "1 Infinite Loop"
 * - `line_2` - the second line of the address, e.g. "Block 1"
 * - `line_3`, `line_4` - additional address lines, same as above
 * - `locality` - the town, neighbourhood or area, e.g. "Cupertino"
 * - `region` - the state, county, province or region, e.g. "CA"
 * - `postcode` - the postal or zip code, e.g. "95014"
 * - `country_code` - the ISO 3166-1 alpha-2 country code, e.g. "US"
 * - `latitude` - latitudinal coordinates, e.g. "37.331741"
 * - `longitude` - longitudinal coordinates, e.g. "-122.030333"
 *
 * There are some properties which are not presently shown in the Attio app but are captured by the API—for example, address lines or postcodes.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-location
 */
export const Location = {
	input: Schema.Union(
		Schema.String, // Address string
		Schema.Struct({
			line_1: Schema.NullOr(Schema.String),
			line_2: Schema.NullOr(Schema.String),
			line_3: Schema.NullOr(Schema.String),
			line_4: Schema.NullOr(Schema.String),
			locality: Schema.NullOr(Schema.String),
			region: Schema.NullOr(Schema.String),
			postcode: Schema.NullOr(Schema.String),
			country_code: Schema.NullOr(CountryCode),
			latitude: Schema.NullOr(Schema.NumberFromString),
			longitude: Schema.NullOr(Schema.NumberFromString),
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("location"),
			line_1: Schema.NullOr(Schema.String),
			line_2: Schema.NullOr(Schema.String),
			line_3: Schema.NullOr(Schema.String),
			line_4: Schema.NullOr(Schema.String),
			locality: Schema.NullOr(Schema.String),
			region: Schema.NullOr(Schema.String),
			postcode: Schema.NullOr(Schema.String),
			country_code: Schema.NullOr(CountryCode),
			latitude: Schema.NullOr(Schema.NumberFromString),
			longitude: Schema.NullOr(Schema.NumberFromString),
		}),
	),
} satisfies AttributeDef

/**
 * # (Personal) name
 *
 * **A person’s name**
 *
 * Name attributes represent a person’s name. They have three properties: `first_name`, `last_name` and `full_name`.
 *
 * Only the person object has a `name` attribute. Name attributes cannot be created by users.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-personal-name
 */
export const PersonalName = {
	input: Schema.Union(
		Schema.String, // "Last, First" format
		Schema.Struct({
			first_name: Schema.String,
			last_name: Schema.String,
			full_name: Schema.optional(Schema.String),
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("personal-name"),
			first_name: Schema.String,
			last_name: Schema.String,
			full_name: Schema.String,
		}),
	),
} satisfies AttributeDef

/**
 * # Number
 *
 * **Quantities, sums and metrics**
 *
 * Number attributes store floating point numbers with up to four decimal places of precision.
 *
 * An example of a number attribute is the `twitter_follower_count` attribute on both the company and person objects.
 *
 * Only single-select number attributes are supported.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-number
 */
export const Number = {
	input: Schema.Union(
		Schema.Number,
		Schema.Array(
			Schema.Struct({
				value: Schema.Number,
			}),
		),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("number"),
			value: Schema.Number,
		}),
	),
} satisfies AttributeDef

/**
 * # Phone number
 *
 * **International telephone numbers**
 *
 * Phone number attributes represent an international telephone number. We follow the E164 format, which means all phone numbers are prefixed with a country code.
 *
 * The only default phone number attribute is the multi-select `phone_numbers` attribute on the person object, although you can create phone number attributes on other objects or lists.
 *
 * This is the single-select variant of the phone number attribute.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-phone-number
 */
export const PhoneNumber: AttributeDef = {
	input: Schema.Union(
		Schema.String,
		Schema.Struct({
			original_phone_number: Schema.String,
			country_code: Schema.NullOr(CountryCode),
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("phone-number"),
			original_phone_number: Schema.String,
			normalized_phone_number: Schema.String,
			country_code: CountryCode,
		}),
	),
}

/**
 * # Phone numbers
 *
 * **International telephone numbers**
 *
 * Phone number attributes represent an international telephone number. We follow the E164 format, which means all phone numbers are prefixed with a country code.
 *
 * The only default phone number attribute is the multi-select `phone_numbers` attribute on the person object, although you can create phone number attributes on other objects or lists.
 *
 * This is the multi-select variant of the phone number attribute.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-phone-number
 */
export const PhoneNumbers: AttributeDef = {
	input: Schema.Union(
		Schema.String,
		Schema.Array(Schema.String),
		Schema.Array(
			Schema.Struct({
				original_phone_number: Schema.String,
				country_code: Schema.NullOr(CountryCode),
			}),
		),
	),
	output: Schema.Array(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("phone-number"),
			original_phone_number: Schema.String,
			normalized_phone_number: Schema.String,
			country_code: CountryCode,
		}),
	),
}

/**
 * # Rating
 *
 * **Star ratings from 0 to 5**
 *
 * Rating attributes are numeric values from 0 to 5, displayed in the UI as a proportion of 5 stars.
 *
 * There are no default rating attributes in Attio. You can create rating attributes through the UI or API.
 *
 * Only single-select rating attributes are permitted.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-rating
 */
export const Rating: AttributeDef = {
	input: Schema.Union(
		Schema.Number.pipe(
			Schema.greaterThanOrEqualTo(0),
			Schema.lessThanOrEqualTo(5),
		),
		Schema.Array(
			Schema.Struct({
				value: Schema.Number.pipe(
					Schema.greaterThanOrEqualTo(0),
					Schema.lessThanOrEqualTo(5),
				),
			}),
		).pipe(Schema.maxItems(1)),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("rating"),
			value: Schema.Number,
		}),
	),
}

export const RecordReference: AttributeDef = {
	input: Schema.Union(
		Schema.UUID, // Record ID
		Schema.Struct({
			target_object: Schema.String,
			target_record_id: Schema.UUID,
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.String,
			target_record_id: Schema.UUID,
		}),
	),
}

export const RecordReferences: AttributeDef = {
	input: Schema.Union(
		Schema.UUID,
		Schema.Array(Schema.UUID),
		Schema.Array(
			Schema.Struct({
				target_object: Schema.String,
				target_record_id: Schema.UUID,
			}),
		),
	),
	output: Schema.Array(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.String,
			target_record_id: Schema.UUID,
		}),
	),
}

export const Select: AttributeDef = {
	input: Schema.Union(
		Schema.UUID, // Option ID
		Schema.Struct({
			option_id: Schema.UUID,
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("select"),
			option: Schema.Struct({
				id: Schema.Union(
					Schema.UUID,
					Schema.Struct({
						option_id: Schema.UUID,
					}),
				),
				title: Schema.String,
				is_archived: Schema.Boolean,
			}),
		}),
	),
}

// Helper to create Select field with predefined options
export const SelectWith = (...options: string[]): AttributeDef => ({
	input: Schema.Literal(...options),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("select"),
			option: Schema.Struct({
				id: Schema.Union(
					Schema.UUID,
					Schema.Struct({
						option_id: Schema.UUID,
					}),
				),
				title: Schema.String,
				is_archived: Schema.Boolean,
			}),
		}),
	),
})

export const MultiSelect = {
	input: Schema.Union(
		Schema.UUID,
		Schema.Array(Schema.UUID),
		Schema.Array(
			Schema.Struct({
				option_id: Schema.UUID,
			}),
		),
	),
	output: Schema.Array(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("select"),
			option: Schema.Struct({
				id: Schema.Union(
					Schema.UUID,
					Schema.Struct({
						option_id: Schema.UUID,
					}),
				),
				title: Schema.String,
				is_archived: Schema.Boolean,
			}),
		}),
	),
} satisfies AttributeDef

/**
 * # Status
 *
 * **Similar to select attributes, originally designed for use in Lists**
 *
 * Just like select attributes, status attributes are a constrained input type, where the user must pick from a predefined list. They are used in the Attio UI to define the different columns on a kanban board, but they can also be used with objects directly.
 *
 * There’s only one predefined status attribute, available on the deal object as stage.
 *
 * The possible values of a status attribute are known as “statuses”, and there are separate APIs for managing them.
 *
 * All status attributes are single-select.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-status
 */
export const Status = {
	input: Schema.Union(
		Schema.String,
		Schema.Struct({
			status: Schema.Union(Schema.String, Schema.UUID),
		}),
	),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("status"),
			status: Schema.Struct({
				id: Schema.UUID,
				title: Schema.String,
			}),
		}),
	),
} satisfies AttributeDef

export const Text = {
	input: Schema.String,
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("text"),
			value: Schema.String,
		}),
	),
} satisfies AttributeDef

export const Timestamp = {
	input: Schema.Union(Schema.String, Schema.Date),
	output: ApiSingleValue(
		Schema.Struct({
			...BaseAttribute.fields,
			attribute_type: Schema.Literal("timestamp"),
			value: Schema.String,
		}),
	),
} satisfies AttributeDef
