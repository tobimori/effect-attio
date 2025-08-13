import * as Schema from "effect/Schema"
import { Actor, ActorType } from "../shared/schemas.js"

const BaseFieldWrapper = {
	active_from: Schema.DateTimeUtc,
	active_until: Schema.NullOr(Schema.DateTimeUtc),
	created_by_actor: Actor,
}

export const Text = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("text"),
	value: Schema.String,
})

export const Number = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("number"),
	value: Schema.Number,
})

export const Checkbox = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("checkbox"),
	value: Schema.Boolean,
})

export const Currency = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("currency"),
	currency_value: Schema.Union(Schema.Number, Schema.NumberFromString),
	currency_code: Schema.String,
})

export const Date = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("date"),
	value: Schema.String,
})

export const Timestamp = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("timestamp"),
	value: Schema.DateTimeUtc,
})

export const Domain = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("domain"),
	domain: Schema.String,
	root_domain: Schema.String,
})

export const EmailAddress = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("email-address"),
	email_address: Schema.String,
	original_email_address: Schema.String,
	email_domain: Schema.String,
	email_root_domain: Schema.String,
	email_local_specifier: Schema.String,
})

export const PhoneNumber = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("phone-number"),
	original_phone_number: Schema.String,
	country_code: Schema.String,
	phone_number: Schema.String,
})

export const PersonalName = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("personal-name"),
	first_name: Schema.String,
	last_name: Schema.String,
	full_name: Schema.String,
})

export const Location = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("location"),
	locality: Schema.NullOr(Schema.String),
	region: Schema.NullOr(Schema.String),
	postcode: Schema.NullOr(Schema.String),
	country_code: Schema.NullOr(Schema.String),
	line_1: Schema.NullOr(Schema.String),
	line_2: Schema.NullOr(Schema.String),
	line_3: Schema.NullOr(Schema.String),
	line_4: Schema.NullOr(Schema.String),
	latitude: Schema.NullOr(Schema.Union(Schema.Number, Schema.NumberFromString)),
	longitude: Schema.NullOr(Schema.Union(Schema.Number, Schema.NumberFromString)),
})

export const Rating = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("rating"),
	value: Schema.Number,
})

export const ActorReference = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("actor-reference"),
	referenced_actor_type: ActorType,
	referenced_actor_id: Schema.UUID,
})

export const RecordReference = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("record-reference"),
	target_object: Schema.String,
	target_record_id: Schema.UUID,
})

export const Select = Schema.Struct({
	...BaseFieldWrapper,
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
})

export const Status = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("status"),
	status: Schema.Struct({
		id: Schema.UUID,
		title: Schema.String,
	}),
})

export const Interaction = Schema.Struct({
	...BaseFieldWrapper,
	attribute_type: Schema.Literal("interaction"),
	interaction_type: Schema.Literal("email", "call", "meeting"),
	interacted_at: Schema.DateTimeUtc,
	owner_actor: Actor,
})
