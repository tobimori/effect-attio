import {
	type AttributeDef,
	type ReferenceTargetAttribute,
} from "./schemas/attribute-builder.js"
import { createSchemas, type CreatedSchemas } from "./schemas/helpers.js"
import type * as Objects from "./schemas/objects.js"
import * as StandardObjects from "./schemas/objects.js"

type AttributeLike = AttributeDef

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

type ExplicitlyEnabledObjectNames<T extends Record<string, ObjectConfig>> = {
	[K in keyof T]: T[K] extends false ? never : K
}[keyof T]

type DefaultEnabledObjectNames<T extends Record<string, ObjectConfig>> = {
	[K in keyof typeof StandardObjects]: K extends keyof T
		? never
		: K extends (typeof DEFAULT_DISABLED_OBJECTS)[number]
			? never
			: K
}[keyof typeof StandardObjects]

type AvailableObjectNames<T extends Record<string, ObjectConfig>> =
	| ExplicitlyEnabledObjectNames<T>
	| DefaultEnabledObjectNames<T>

type ResolveReferenceFields<Fields, T extends Record<string, ObjectConfig>> = {
	[
		K in keyof Fields as Fields[K] extends ReferenceTargetAttribute<
			infer ObjectName
		>
			? ObjectName extends AvailableObjectNames<T>
				? K
				: never
			: K
	]: Fields[K]
}

type StandardObjectFields<
	K extends keyof typeof StandardObjects,
	T extends Record<string, ObjectConfig>,
> = ResolveReferenceFields<(typeof StandardObjects)[K], T>

export type EnabledObjects<T extends Record<string, ObjectConfig>> = {
	[K in keyof T as T[K] extends false ? never : K]: T[K] extends false
		? never
		: T[K] extends true
			? K extends keyof typeof StandardObjects
				? StandardObjectFields<K, T>
				: never
			: T[K] extends Record<string, AttributeLike>
				? T[K]
				: never
}

export type MergedObjectFields<T extends Record<string, ObjectConfig>> = {
	[K in keyof EnabledObjects<T>]: K extends keyof typeof StandardObjects
		? StandardObjectFields<K, T> & EnabledObjects<T>[K]
		: EnabledObjects<T>[K]
} & {
	[
		K in keyof typeof StandardObjects as K extends keyof T
			? T[K] extends false
				? never
				: never
			: K extends (typeof DEFAULT_DISABLED_OBJECTS)[number]
				? never
				: K
	]: StandardObjectFields<K, T>
}

function resolveReferenceFields(
	fields: Record<string, AttributeLike>,
	configuredObjects: Record<string, ObjectConfig>,
) {
	return Object.fromEntries(
		Object.entries(fields).filter(([, field]) => {
			const referenceTarget = field.referenceTarget

			return (
				referenceTarget === undefined ||
				(Object.hasOwn(configuredObjects, referenceTarget)
					? configuredObjects[referenceTarget] !== false
					: Object.hasOwn(StandardObjects, referenceTarget) &&
						!DEFAULT_DISABLED_OBJECTS.includes(
							referenceTarget as (typeof DEFAULT_DISABLED_OBJECTS)[number],
						))
			)
		}),
	)
}

export function processSchemas<
	T extends Record<string, ObjectConfig>,
	L extends Record<string, ListConfig>,
>(config: AttioClientSchemas<T, L>) {
	const objectSchemas = {} as any
	const listSchemas = {} as any
	const configuredObjects: Record<string, ObjectConfig> = config.objects ?? {}

	// process objects
	for (const [name, objectConfig] of Object.entries(configuredObjects)) {
		if (objectConfig === false) continue

		const unfilteredStandardFields =
			StandardObjects[name as keyof typeof StandardObjects]
		const standardFields = unfilteredStandardFields
			? resolveReferenceFields(unfilteredStandardFields, configuredObjects)
			: undefined

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

			objectSchemas[name] = createSchemas(
				resolveReferenceFields(fields, configuredObjects),
				"record_id",
			)
		}
	}

	// process lists
	for (const [name, listConfig] of Object.entries(config.lists ?? [])) {
		listSchemas[name] = createSchemas(listConfig, "entry_id")
	}

	return {
		objects: objectSchemas as {
			[K in keyof MergedObjectFields<T>]: CreatedSchemas<
				MergedObjectFields<T>[K],
				"record_id"
			>
		},
		lists: listSchemas as {
			[K in keyof L]: CreatedSchemas<L[K], "entry_id">
		},
	}
}
