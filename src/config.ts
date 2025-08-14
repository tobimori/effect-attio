import type { AttributeDef } from "./schemas/attribute-builder.js"
import { createSchemas } from "./schemas/helpers.js"
import * as StandardObjects from "./schemas/objects.js"

export type ObjectConfig = boolean | Record<string, AttributeDef>

export type ObjectsConfig<T extends Record<string, ObjectConfig> = {}> = {
	objects?: T
}

export const DEFAULT_DISABLED_OBJECTS = [
	"deals",
	"users",
	"workspaces",
] as const

export type EnabledObjects<T extends Record<string, ObjectConfig>> = {
	[K in keyof T as T[K] extends false ? never : K]: T[K] extends false
		? never
		: T[K] extends true
			? K extends keyof typeof StandardObjects
				? (typeof StandardObjects)[K]
				: never
			: T[K] extends Record<string, AttributeDef>
				? T[K]
				: never
}

export type MergedObjectFields<T extends Record<string, ObjectConfig>> = {
	[K in keyof EnabledObjects<T>]: K extends keyof typeof StandardObjects
		? (typeof StandardObjects)[K] & EnabledObjects<T>[K]
		: EnabledObjects<T>[K]
} & {
	[K in keyof typeof StandardObjects as K extends keyof T
		? T[K] extends false
			? never
			: never
		: K]: (typeof StandardObjects)[K]
}

export function processObjectsConfig<T extends Record<string, ObjectConfig>>(
	config: ObjectsConfig<T>,
) {
	const schemas: Record<string, ReturnType<typeof createSchemas>> = {}

	if (config.objects) {
		for (const [name, objectConfig] of Object.entries(config.objects)) {
			if (objectConfig === false) continue

			const standardFields =
				StandardObjects[name as keyof typeof StandardObjects]

			if (standardFields) {
				if (objectConfig === true) {
					schemas[name] = createSchemas(standardFields)
				} else {
					const mergedFields = { ...standardFields, ...objectConfig }
					schemas[name] = createSchemas(mergedFields)
				}
			} else {
				if (typeof objectConfig !== "boolean") {
					schemas[name] = createSchemas(objectConfig)
				}
			}
		}
	}

	for (const [name, fields] of Object.entries(StandardObjects)) {
		if (!config.objects || !(name in config.objects)) {
			if (
				// skip objects that are disabled by default unless explicitly enabled
				DEFAULT_DISABLED_OBJECTS.includes(
					name as (typeof DEFAULT_DISABLED_OBJECTS)[number],
				)
			) {
				continue
			}

			schemas[name] = createSchemas(fields)
		}
	}

	return schemas as {
		[K in keyof MergedObjectFields<T>]: ReturnType<
			typeof createSchemas<MergedObjectFields<T>[K]>
		>
	}
}
