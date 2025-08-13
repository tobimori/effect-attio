import * as Schema from "effect/Schema"
import * as BaseFields from "./base-fields.js"

// Single-select fields (array with max 1 item)
export const Text = Schema.Array(BaseFields.Text).pipe(Schema.maxItems(1))
export const Number = Schema.Array(BaseFields.Number).pipe(Schema.maxItems(1))
export const Checkbox = Schema.Array(BaseFields.Checkbox).pipe(
	Schema.maxItems(1),
)
export const Currency = Schema.Array(BaseFields.Currency).pipe(
	Schema.maxItems(1),
)
export const Date = Schema.Array(BaseFields.Date).pipe(Schema.maxItems(1))
export const Timestamp = Schema.Array(BaseFields.Timestamp).pipe(
	Schema.maxItems(1),
)
export const PersonalName = Schema.Array(BaseFields.PersonalName).pipe(
	Schema.maxItems(1),
)
export const Location = Schema.Array(BaseFields.Location).pipe(
	Schema.maxItems(1),
)
export const Rating = Schema.Array(BaseFields.Rating).pipe(Schema.maxItems(1))
export const ActorReference = Schema.Array(BaseFields.ActorReference).pipe(
	Schema.maxItems(1),
)
export const Select = Schema.Array(BaseFields.Select).pipe(Schema.maxItems(1))
export const Status = Schema.Array(BaseFields.Status).pipe(Schema.maxItems(1))
export const Interaction = Schema.Array(BaseFields.Interaction).pipe(
	Schema.maxItems(1),
)
export const RecordReference = Schema.Array(BaseFields.RecordReference).pipe(
	Schema.maxItems(1),
)

// Type for select options - either title string or option ID object
type SelectOption = string | { option_id: string }

// Select with predefined options (single-select)
export function SelectWith<Options extends readonly SelectOption[]>(
	...options: Options
) {
	return Schema.Array(
		BaseFields.Select.pipe(
			Schema.filter((field) => {
				if (options.length === 0) return true

				// Check if field matches any of the provided options
				return options.some((opt) => {
					if (typeof opt === "string") {
						// Match by title
						return field.option.title === opt
					} else {
						// Match by option_id
						const fieldId =
							typeof field.option.id === "string"
								? field.option.id
								: field.option.id.option_id
						return fieldId === opt.option_id
					}
				})
			}),
		),
	).pipe(Schema.maxItems(1))
}

// Multi-select fields (can have multiple items)
export const EmailAddresses = Schema.Array(BaseFields.EmailAddress)
export const PhoneNumbers = Schema.Array(BaseFields.PhoneNumber)
export const MultiSelect = Schema.Array(BaseFields.Select)
export const RecordReferences = Schema.Array(BaseFields.RecordReference)
export const Domains = Schema.Array(BaseFields.Domain)
export const ActorReferences = Schema.Array(BaseFields.ActorReference) // Multi-select actor reference (shown as "User" in UI)

// MultiSelect with predefined options
export function MultiSelectWith<Options extends readonly SelectOption[]>(
	...options: Options
) {
	return Schema.Array(
		BaseFields.Select.pipe(
			Schema.filter((field) => {
				if (options.length === 0) return true

				// Check if field matches any of the provided options
				return options.some((opt) => {
					if (typeof opt === "string") {
						// Match by title
						return field.option.title === opt
					} else {
						// Match by option_id
						const fieldId =
							typeof field.option.id === "string"
								? field.option.id
								: field.option.id.option_id
						return fieldId === opt.option_id
					}
				})
			}),
		),
	)
}
