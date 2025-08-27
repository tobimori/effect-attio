import type { AttributeDef } from "./schemas/attribute-builder.js"
import { createSchemas } from "./schemas/helpers.js"
import type * as Objects from "./schemas/objects.js"
import * as StandardObjects from "./schemas/objects.js"

// Objects can have fields that are either AttributeDef or have input/output properties (like .Multiple)
type AttributeLike = AttributeDef | { input: any; output: any }

export type ObjectConfig = boolean | Record<string, AttributeLike>
export type ListConfig = Record<string, AttributeLike>

export type AttioClientSchemas<
	T extends Record<string | keyof typeof Objects, ObjectConfig> = {
		[k: string]: ObjectConfig
	},
	L extends Record<string, ListConfig> = {
		[k: string]: ListConfig
	},
> = {
	objects?: T
	lists?: L
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
			: T[K] extends Record<string, AttributeLike>
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
		: K extends (typeof DEFAULT_DISABLED_OBJECTS)[number]
			? never
			: K]: (typeof StandardObjects)[K]
}

export function processSchemas<
	T extends Record<string, ObjectConfig>,
	L extends Record<string, ListConfig>,
>(config: AttioClientSchemas<T, L>) {
	const objectSchemas = {} as any
	const listSchemas = {} as any

	// process objects
	for (const [name, objectConfig] of Object.entries(config.objects ?? [])) {
		if (objectConfig === false) continue

		const standardFields = StandardObjects[name as keyof typeof StandardObjects]

		if (standardFields) {
			if (objectConfig === true) {
				objectSchemas[name] = createSchemas(standardFields, "record_id")
			} else {
				const mergedFields = { ...standardFields, ...objectConfig }
				objectSchemas[name] = createSchemas(mergedFields, "record_id")
			}
		} else {
			if (typeof objectConfig !== "boolean") {
				objectSchemas[name] = createSchemas(objectConfig, "record_id")
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

			objectSchemas[name] = createSchemas(fields, "record_id")
		}
	}

	// process lists
	for (const [name, listConfig] of Object.entries(config.lists ?? [])) {
		listSchemas[name] = createSchemas(listConfig, "entry_id")
	}

	return {
		objects: objectSchemas as {
			[K in keyof MergedObjectFields<T>]: ReturnType<
				typeof createSchemas<MergedObjectFields<T>[K], "record_id">
			>
		},
		lists: listSchemas as {
			[K in keyof L]: ReturnType<typeof createSchemas<L[K], "entry_id">>
		},
	}
}
