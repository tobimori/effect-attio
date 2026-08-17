export type ReplaceField<T, Field extends keyof T, Value> = {
	[Key in keyof T]: Key extends Field ? Value : T[Key]
}
