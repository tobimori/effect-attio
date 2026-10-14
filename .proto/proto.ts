import type { AttributeDef } from "../src/schemas/attribute-builder.js"
import * as Attributes from "../src/schemas/attributes.js"

// built-in schema fields
const activities = {
	title: Attributes.Text,
	timestamp: Attributes.Timestamp.Required,
}
const interactions = { ...activities, direction: Attributes.Select.Required }
const BuiltInSchemas = {
	activities,
	interactions,
	calls: { ...interactions, outcome: Attributes.Select },
	emails: { ...interactions },
}
type BuiltInSchemas = typeof BuiltInSchemas
type BuiltInSchemaName = keyof BuiltInSchemas
type SystemActivities = { phone_calls: "calls" }

// config shapes
interface ActivitySchemaConfig {
	readonly attributes?: Record<string, AttributeDef>
	readonly schemas?: Record<string, ActivitySchemaConfig>
}
type ActivitySchemasConfig = {
	readonly [K in BuiltInSchemaName]?: Record<string, ActivitySchemaConfig>
}
interface ActivityConfig {
	// the literal union keeps `extends` from widening to string during inference
	readonly extends: BuiltInSchemaName | (string & {})
	readonly attributes?: Record<string, AttributeDef>
}
type Config = {
	activitySchemas?: ActivitySchemasConfig
	activities?: Record<string, ActivityConfig>
}

// flatten the tree into [slug, fields] entries
type Attrs<S> = S extends { attributes: infer A } ? A : {}
type Children<S> = S extends { schemas: infer C } ? C : never
type SchemaEntries<R, Base> = R extends object
	? {
			[K in keyof R & string]:
				| [K, Base & Attrs<R[K]>]
				| SchemaEntries<Children<R[K]>, Base & Attrs<R[K]>>
		}[keyof R & string]
	: never
type CustomSchemaEntries<S> = {
	[P in keyof S & BuiltInSchemaName]: SchemaEntries<S[P], BuiltInSchemas[P]>
}[keyof S & BuiltInSchemaName]

type EntryMap<E extends [string, unknown]> = { [X in E as X[0]]: X[1] }
export type SchemaFields<C extends Config> = BuiltInSchemas &
	EntryMap<CustomSchemaEntries<C["activitySchemas"]>>
type SchemaName<C extends Config> = Extract<keyof SchemaFields<C>, string>

type ExtendsOf<A> = A extends { extends: infer E } ? E : never
// conditional keeps TypeScript from expanding the recursive Config constraint
export type ActivityFields<
	C extends Config,
	K extends keyof C["activities"],
> = C extends unknown
	? SchemaFields<C> extends infer M
		? M[ExtendsOf<C["activities"][K]> & keyof M] & Attrs<C["activities"][K]>
		: never
	: never

// validation
type Slugs<R> = R extends object
	? { [K in keyof R & string]: K | Slugs<Children<R[K]>> }[keyof R & string]
	: never
type ValidateSchemaTree<R, Taken> = {
	[K in keyof R]: K extends Taken | Slugs<Omit<R, K>>
		? never
		: Omit<R[K], "schemas"> &
				(R[K] extends { schemas: infer S }
					? { schemas: ValidateSchemaTree<S, Taken | K | Slugs<Omit<R, K>>> }
					: {})
}
type ValidateSchemaRoots<S> = {
	[P in keyof S]: P extends BuiltInSchemaName
		? ValidateSchemaTree<
				S[P],
				| BuiltInSchemaName
				| { [Q in Exclude<keyof S, P>]: Slugs<S[Q]> }[Exclude<keyof S, P>]
			>
		: never
}
type ValidateActivities<C extends Config> = {
	[K in keyof C["activities"]]: Omit<C["activities"][K], "extends"> & {
		readonly extends: K extends keyof SystemActivities
			? SystemActivities[K]
			: SchemaName<C>
	}
}
type Validate<C extends Config> = {
	[K in keyof C]: K extends "activitySchemas"
		? ValidateSchemaRoots<C[K]>
		: K extends "activities"
			? ValidateActivities<C>
			: C[K]
}

declare const define: <T extends Config>(config: T & Validate<NoInfer<T>>) => T

// ---- checks ----
const config = define({
	activitySchemas: {
		calls: {
			asdas: {
				attributes: { region: Attributes.Select },
				schemas: {
					asdas_outbound: { attributes: { campaign: Attributes.Text } },
				},
			},
		},
		activities: { visits: {} },
	},
	activities: {
		phone_calls: { extends: "calls", attributes: { sadads: Attributes.Text } },
		acme_demo_calls: {
			extends: "asdas_outbound",
			attributes: { external_id: Attributes.Text.Required },
		},
		acme_site_visits: { extends: "visits" },
	},
})

type Demo = ActivityFields<typeof config, "acme_demo_calls">
const demoKeys: Array<keyof Demo> = [
	"title",
	"timestamp",
	"direction",
	"outcome",
	"region",
	"campaign",
	"external_id",
]
// @ts-expect-error site visits do not get call fields
const visitKey: keyof ActivityFields<typeof config, "acme_site_visits"> = "outcome"

define({
	activities: {
		// @ts-expect-error unknown schema
		bad: { extends: "nope" },
	},
})

define({
	activities: {
		// @ts-expect-error system activity uses a fixed schema
		phone_calls: { extends: "emails" },
	},
})

define({
	activitySchemas: {
		calls: {
			// @ts-expect-error duplicate slug in another branch
			dup: {},
		},
		emails: {
			// @ts-expect-error duplicate slug in another branch
			dup: {},
		},
	},
})

define({
	activitySchemas: {
		calls: {
			// @ts-expect-error built-in name used as a custom slug
			interactions: {},
		},
	},
})

define({
	activitySchemas: {
		calls: {
			outer: {
				schemas: {
					// @ts-expect-error nested duplicate of its parent
					outer: {},
				},
			},
		},
	},
})

export { demoKeys, visitKey }
type DbgEntries = CustomSchemaEntries<(typeof config)["activitySchemas"]>
type DbgNames = SchemaName<typeof config>
const dbgName: DbgNames = "asdas_outbound"
const dbgFirst: DbgEntries[0] = "asdas"
export { dbgName, dbgFirst }
