export type ReplaceField<T, Field extends keyof T, Value> = T extends unknown
	? { [Key in keyof T]: Key extends Field ? Value : T[Key] }
	: never

export type ReplaceRequiredField<T, Field extends PropertyKey, Value> =
	T extends Record<Field, unknown>
		? { [Key in keyof T]: Key extends Field ? Value : T[Key] }
		: T
