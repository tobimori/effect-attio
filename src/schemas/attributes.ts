import * as Schema from "effect/Schema"
import { DateTimeISOString } from "../shared/datetime-input.js"
import { Actor } from "../shared/schemas.js"
import { type AttributeDef, makeAttribute } from "./attribute-builder.js"
import { CountryCode, CurrencyCode } from "./values.js"

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
export const ActorReference = makeAttribute(
	{
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
		output: Schema.Union(
			Schema.Struct({
				attribute_type: Schema.Literal("actor-reference"),
				referenced_actor_type: Schema.Literal("system"),
				referenced_actor_id: Schema.Null,
			}),
			Schema.Struct({
				attribute_type: Schema.Literal("actor-reference"),
				referenced_actor_type: Schema.Literal(
					"api-token",
					"workspace-member",
					"app",
				),
				referenced_actor_id: Schema.UUID,
			}),
		),
	},
	{ multiple: true },
)

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
export const Checkbox = makeAttribute({
	input: Schema.Union(Schema.Boolean, Schema.Literal("true", "false")),
	output: Schema.Struct({
		attribute_type: Schema.Literal("checkbox"),
		value: Schema.Boolean,
	}),
})

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
export const Currency = makeAttribute({
	input: Schema.Union(
		Schema.Number,
		Schema.String,
		Schema.Struct({
			currency_value: Schema.Union(Schema.Number, Schema.String),
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("currency"),
		currency_value: Schema.NumberFromString,
		currency_code: CurrencyCode,
	}),
})

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
export const Date = makeAttribute({
	input: Schema.Union(
		DateTimeISOString,
		Schema.Struct({
			value: DateTimeISOString,
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("date"),
		value: Schema.DateTimeUtc,
	}),
})

/**
 * # Domain
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
export const Domain = makeAttribute(
	{
		input: Schema.Union(
			Schema.String,
			Schema.Struct({
				domain: Schema.String,
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("domain"),
			domain: Schema.String,
			root_domain: Schema.String,
		}),
	},
	{ multiple: true },
)

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
export const EmailAddress = makeAttribute(
	{
		input: Schema.Union(
			Schema.String,
			Schema.Struct({
				email_address: Schema.String,
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("email-address"),
			email_address: Schema.String,
			original_email_address: Schema.String,
			email_domain: Schema.String,
			email_root_domain: Schema.String,
			email_local_specifier: Schema.String,
		}),
	},
	{ multiple: true },
)

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
export const Interaction = makeAttribute({
	/* It is not currently possible to write Interaction values, they are only created by the Attio system. */
	input: Schema.Void,
	output: Schema.Struct({
		attribute_type: Schema.Literal("interaction"),
		interaction_type: Schema.Literal("email", "calendar-event"),
		interacted_at: Schema.DateTimeUtc,
		owner_actor: Actor,
	}),
})

/**
 * # Location
 *
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
export const Location = makeAttribute({
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
	output: Schema.Struct({
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
})

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
export const PersonalName = makeAttribute({
	input: Schema.Union(
		Schema.String, // "Last, First" format
		Schema.Struct({
			first_name: Schema.String,
			last_name: Schema.String,
			full_name: Schema.String,
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("personal-name"),
		first_name: Schema.String,
		last_name: Schema.String,
		full_name: Schema.String,
	}),
})

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
export const Number = makeAttribute({
	input: Schema.Union(
		Schema.Number,
		Schema.Struct({
			value: Schema.Number,
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("number"),
		value: Schema.Number,
	}),
})

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
export const PhoneNumber = makeAttribute(
	{
		input: Schema.Union(
			Schema.String,
			Schema.Struct({
				original_phone_number: Schema.String,
				country_code: Schema.NullOr(CountryCode),
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("phone-number"),
			original_phone_number: Schema.String,
			normalized_phone_number: Schema.String,
			country_code: CountryCode,
		}),
	},
	{ multiple: true },
)

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
export const Rating = makeAttribute({
	input: Schema.Union(
		Schema.Number.pipe(
			Schema.greaterThanOrEqualTo(0),
			Schema.lessThanOrEqualTo(5),
		),
		Schema.Struct({
			value: Schema.Number.pipe(
				Schema.greaterThanOrEqualTo(0),
				Schema.lessThanOrEqualTo(5),
			),
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("rating"),
		value: Schema.Number,
	}),
})

/**
 * # Record reference
 *
 * **Relationships and one-way links between records**
 *
 * Record reference attributes allow you to point to other records of the same or different objects. They enable creating relationships between records, such as linking a person to a company or a deal to associated people.
 *
 * This is the single-select variant of the record reference attribute.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-record-reference
 */
export const RecordReference = makeAttribute(
	{
		input: Schema.Union(
			Schema.UUID, // Record ID
			Schema.Struct({
				target_object: Schema.String,
				target_record_id: Schema.UUID,
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.String,
			target_record_id: Schema.UUID,
		}),
	},
	{ multiple: true },
)

/**
 * # Company record reference
 *
 * **Reference to a company record**
 *
 * Special variant of record reference that only allows company objects.
 * Supports writing with domains as a shorthand.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-record-reference
 */
export const CompanyRecordReference = makeAttribute(
	{
		input: Schema.Union(
			Schema.String, // Domain string
			Schema.UUID, // Record ID
			Schema.Struct({
				target_object: Schema.Literal("companies"),
				target_record_id: Schema.UUID,
			}),
			Schema.Struct({
				domains: Schema.Array(Schema.Struct({ domain: Schema.String })),
				target_object: Schema.Literal("companies"),
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.Literal("companies"),
			target_record_id: Schema.UUID,
		}),
	},
	{ multiple: true },
)

/**
 * # Person record reference
 *
 * **Reference to a person record**
 *
 * Special variant of record reference that only allows person objects.
 * Supports writing with email addresses as a shorthand.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-record-reference
 */
export const PersonRecordReference = makeAttribute(
	{
		input: Schema.Union(
			Schema.String, // Email string
			Schema.UUID, // Record ID
			Schema.Struct({
				target_object: Schema.Literal("people"),
				target_record_id: Schema.UUID,
			}),
			Schema.Struct({
				email_addresses: Schema.Array(
					Schema.Struct({ email_address: Schema.String }),
				),
				target_object: Schema.Literal("people"),
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.Literal("people"),
			target_record_id: Schema.UUID,
		}),
	},
	{ multiple: true },
)

/**
 * # Deal record reference
 *
 * **Reference to a deal record**
 *
 * Special variant of record reference that only allows deal objects.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-record-reference
 */
export const DealRecordReference = makeAttribute(
	{
		input: Schema.Union(
			Schema.UUID, // Record ID
			Schema.Struct({
				target_object: Schema.Literal("deals"),
				target_record_id: Schema.UUID,
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.Literal("deals"),
			target_record_id: Schema.UUID,
		}),
	},
	{ multiple: true },
)

/**
 * # User record reference
 *
 * **Reference to a user record**
 *
 * Special variant of record reference that only allows user objects.
 * Supports writing with user_id as a shorthand.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-record-reference
 */
export const UserRecordReference = makeAttribute(
	{
		input: Schema.Union(
			Schema.String, // User ID string
			Schema.UUID, // Record ID
			Schema.Struct({
				target_object: Schema.Literal("users"),
				target_record_id: Schema.UUID,
			}),
			Schema.Struct({
				user_id: Schema.Array(Schema.Struct({ value: Schema.String })),
				target_object: Schema.Literal("users"),
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.Literal("users"),
			target_record_id: Schema.UUID,
		}),
	},
	{ multiple: true },
)

/**
 * # Workspace record reference
 *
 * **Reference to a workspace record**
 *
 * Special variant of record reference that only allows workspace objects.
 * Supports writing with workspace_id as a shorthand.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-record-reference
 */
export const WorkspaceRecordReference = makeAttribute(
	{
		input: Schema.Union(
			Schema.String, // Workspace ID string
			Schema.UUID, // Record ID
			Schema.Struct({
				target_object: Schema.Literal("workspaces"),
				target_record_id: Schema.UUID,
			}),
			Schema.Struct({
				workspace_id: Schema.Array(Schema.Struct({ value: Schema.String })),
				target_object: Schema.Literal("workspaces"),
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("record-reference"),
			target_object: Schema.Literal("workspaces"),
			target_record_id: Schema.UUID,
		}),
	},
	{ multiple: true },
)

/**
 * # Select
 *
 * **An option from a predefined list**
 *
 * Select attributes are a constrained input type, where the user must pick from a predefined list.
 *
 * Company has several select attributes (they are mostly enriched attributes): `categories`, `estimated_arr_usd` and `employee_range`. `strongest_connection_strength` is also available on both person and company.
 *
 * Attio provides a separate API for managing the select options available.
 *
 * Select attributes may be either single-select or multi-select. In the API, these two variants are represented using the same underlying type, `select`. However, in web and mobile clients, users will see these attributes as two separate types: select and multi-select.
 *
 * Please note that select attributes cannot be configured to be unique.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-select
 */
export const Select = makeAttribute(
	{
		input: Schema.Union(
			Schema.String, // Option title
			Schema.UUID, // Option ID
			Schema.Struct({
				option: Schema.Union(Schema.String, Schema.UUID),
			}),
		),
		output: Schema.Struct({
			attribute_type: Schema.Literal("select"),
			option: Schema.Struct({
				id: Schema.UUID,
				title: Schema.String,
				is_archived: Schema.Boolean,
			}),
		}),
	},
	{ multiple: true },
)

/**
 * Helper to create a Select field with predefined options.
 * This constrains the input to only accept specific string literals.
 *
 * @example
 * const priority = SelectWith("low", "medium", "high")
 */
export const SelectWith = (...options: string[]) =>
	makeAttribute(
		{
			input: Schema.Literal(...options),
			output: Schema.Struct({
				attribute_type: Schema.Literal("select"),
				option: Schema.Struct({
					id: Schema.UUID,
					title: Schema.String,
					is_archived: Schema.Boolean,
				}),
			}),
		},
		{ multiple: true },
	)

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
export const Status = makeAttribute({
	input: Schema.Union(
		Schema.String,
		Schema.Struct({
			status: Schema.Union(Schema.String, Schema.UUID),
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("status"),
		status: Schema.Struct({
			id: Schema.Struct({
				workspace_id: Schema.UUID,
				object_id: Schema.UUID,
				attribute_id: Schema.UUID,
				status_id: Schema.UUID,
			}),
			title: Schema.String,
		}),
	}),
})

/**
 * # Text
 *
 * **Human-readable, unconstrained text inputs**
 *
 * Text attributes are the most common attribute type. They represent unstructured or human-readable data, with a maximum size of 10mb.
 *
 * Examples include `description`, social media handles, and workspace/user IDs. Note that on company objects, `name` is a text attribute, while on person objects, `name` is a separate (Personal) name attribute type.
 *
 * Text attributes are always single-select.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-text
 */
export const Text = makeAttribute({
	input: Schema.Union(
		Schema.String,
		Schema.Struct({
			value: Schema.String,
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("text"),
		value: Schema.String,
	}),
})

/**
 * # Timestamp
 *
 * **A calendar date including time information, stored in UTC**
 *
 * Timestamp attributes represent a single, universal moment in time. They use the ISO 8601 format and are stored with nanosecond precision.
 *
 * Every Attio object has a `created_at` timestamp attribute. Users can also create custom timestamp attributes.
 *
 * Timestamp attributes are always single-select and always returned in UTC timezone.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-timestamp
 */
export const Timestamp = makeAttribute({
	input: Schema.Union(
		DateTimeISOString,
		Schema.Struct({
			value: DateTimeISOString,
		}),
	),
	output: Schema.Struct({
		attribute_type: Schema.Literal("timestamp"),
		value: Schema.DateTimeUtc,
	}),
})
