import { Schema } from "effect"
import type { AttributeDef } from "./attributes.js"

// Helper that creates both input and output schemas from a fields object
export function createSchemas<T extends Record<string, AttributeDef>>(
	fields: T,
) {
	const inputFields = {} as { [K in keyof T]: T[K]["input"] }
	const outputFields = {} as { [K in keyof T]: T[K]["output"] }

	for (const key in fields) {
		if (fields[key]) {
			inputFields[key] = fields[key].input
			outputFields[key] = fields[key].output
		}
	}

	return {
		input: Schema.Struct(inputFields),
		output: Schema.Struct(outputFields),
		fields,
	}
}
