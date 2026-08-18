import type * as Schema from "effect/Schema"
import type { AttributeDef } from "../schemas/attribute-builder.js"

type Json = (typeof Schema.Json)["Type"]

type ComparisonOperator =
	| "eq"
	| "in"
	| "notEmpty"
	| "contains"
	| "startsWith"
	| "endsWith"
	| "lt"
	| "lte"
	| "gt"
	| "gte"

type StringOperator = "eq" | "contains" | "startsWith" | "endsWith"

type StringOperatorWithNotEmpty = StringOperator | "notEmpty"
type TextOperator = StringOperator | "in"
type RangeOperator = "eq" | "lt" | "lte" | "gt" | "gte"

const ColumnType: unique symbol = Symbol("effect-attio/QueryColumn")
const ExpressionType: unique symbol = Symbol("effect-attio/QueryExpression")
const OrderType: unique symbol = Symbol("effect-attio/QueryOrder")

interface ColumnDescriptor {
	readonly attribute: string
	readonly field?: string
	readonly resource?: string
	readonly referenceTarget?: string
	readonly path?: ReadonlyArray<readonly [resource: string, attribute: string]>
}

interface QueryColumn<Value, Operators extends ComparisonOperator> {
	readonly [ColumnType]: {
		readonly descriptor: ColumnDescriptor
		readonly value: Value
		readonly operators: Operators
	}
}

interface QueryExpression {
	readonly [ExpressionType]: ExpressionNode
}

interface QueryComparisonExpression extends QueryExpression {
	readonly [ExpressionType]: ComparisonNode
}

interface QueryOrder {
	readonly [OrderType]: {
		readonly column: ColumnDescriptor
		readonly direction: "asc" | "desc"
	}
}

type AnyColumn = QueryColumn<any, any>
type ColumnValue<Column extends AnyColumn> = Column[typeof ColumnType]["value"]
type ColumnOperators<Column extends AnyColumn> =
	Column[typeof ColumnType]["operators"]
type Supports<Column extends AnyColumn, Operator extends ComparisonOperator> =
	Operator extends ColumnOperators<Column> ? Column : never

type AttributeValue<Attribute extends AttributeDef> = Attribute extends {
	value: infer Value extends Schema.Top
}
	? Value["Type"]
	: never

type AttributeKind<Attribute extends AttributeDef> =
	AttributeValue<Attribute> extends {
		readonly attribute_type: infer Kind extends string
	}
		? Kind
		: never

type SelectTitle<Attribute extends AttributeDef> =
	AttributeValue<Attribute> extends {
		readonly option: { readonly title: infer Title extends string }
	}
		? Title
		: string

type StatusTitle<Attribute extends AttributeDef> =
	AttributeValue<Attribute> extends {
		readonly status: { readonly title: infer Title extends string }
	}
		? Title
		: string

type ReferenceTarget<Attribute extends AttributeDef> = Attribute extends {
	readonly referenceTarget: infer Target extends string
}
	? Target
	: string

type StringColumn<Operators extends ComparisonOperator = StringOperator> =
	QueryColumn<string, Operators>
type NumberColumn = QueryColumn<number, RangeOperator>
type CurrencyColumn = QueryColumn<number | string, RangeOperator>
type DateColumn = QueryColumn<string, RangeOperator>
type DateRangeColumn = QueryColumn<string, Exclude<RangeOperator, "eq">>
type BooleanColumn = QueryColumn<boolean, "eq">

type TextQueryAttribute = StringColumn<TextOperator> & {
	readonly value: StringColumn<TextOperator>
}

type NumberQueryAttribute = NumberColumn & {
	readonly value: NumberColumn
}

type CurrencyQueryAttribute = CurrencyColumn & {
	readonly currency_value: CurrencyColumn
}

type DateQueryAttribute = DateColumn & {
	readonly value: DateColumn
}

type CheckboxQueryAttribute = BooleanColumn & {
	readonly value: BooleanColumn
}

type DomainQueryAttribute = StringColumn<StringOperatorWithNotEmpty> & {
	readonly domain: StringColumn<StringOperatorWithNotEmpty>
	readonly root_domain: StringColumn<StringOperatorWithNotEmpty>
}

type EmailAddressQueryAttribute = StringColumn & {
	readonly email_address: StringColumn
	readonly email_domain: StringColumn
	readonly email_root_domain: StringColumn
}

type PersonalNameQueryAttribute = StringColumn<StringOperatorWithNotEmpty> & {
	readonly first_name: StringColumn<StringOperatorWithNotEmpty>
	readonly last_name: StringColumn<StringOperatorWithNotEmpty>
	readonly full_name: StringColumn<StringOperatorWithNotEmpty>
}

type LocationQueryAttribute = {
	readonly line_1: StringColumn
	readonly line_2: StringColumn
	readonly line_3: StringColumn
	readonly line_4: StringColumn
	readonly locality: StringColumn
	readonly region: StringColumn
	readonly postcode: StringColumn
	readonly country_code: StringColumn<"eq">
}

type PhoneNumberQueryAttribute = StringColumn & {
	readonly phone_number: StringColumn
	readonly country_code: StringColumn<"eq" | "notEmpty">
}

type InteractionQueryAttribute = {
	readonly owner_member_id: StringColumn<"eq" | "notEmpty">
	readonly interaction_type: QueryColumn<
		"email" | "calendar-event",
		"eq" | "notEmpty"
	>
	readonly interacted_at: DateColumn
}

type ActorReferenceQueryAttribute = {
	readonly referenced_actor_type: QueryColumn<
		"api-token" | "workspace-member" | "system" | "app",
		"eq"
	>
	readonly referenced_actor_id: QueryColumn<string | null, "eq">
}

type ObjectQueryFields = Record<string, Record<string, AttributeDef>>
type QueryDepth = ReadonlyArray<unknown>
type NextQueryDepth<Depth extends QueryDepth> = readonly [...Depth, unknown]
type AtMaximumPathDepth<Depth extends QueryDepth> = Depth["length"] extends 4
	? true
	: false

type ReferencedQueryFields<
	Attribute extends AttributeDef,
	Objects extends ObjectQueryFields,
	Depth extends QueryDepth,
> =
	ReferenceTarget<Attribute> extends keyof Objects
		? QueryFields<
				Objects[ReferenceTarget<Attribute>],
				Objects,
				NextQueryDepth<Depth>
			>
		: never

type RecordReferenceQueryAttribute<
	Attribute extends AttributeDef,
	Objects extends ObjectQueryFields,
	Depth extends QueryDepth,
> = {
	readonly target_object: QueryColumn<ReferenceTarget<Attribute>, "eq">
	readonly target_record_id: StringColumn<"eq" | "in">
} & (AtMaximumPathDepth<Depth> extends true
	? {}
	: ReferencedQueryFields<Attribute, Objects, Depth> extends never
		? {}
		: {
				readonly attributes: ReferencedQueryFields<Attribute, Objects, Depth>
			})

type SelectQueryAttribute<Attribute extends AttributeDef> = QueryColumn<
	SelectTitle<Attribute> | string,
	"eq"
> & {
	readonly option: QueryColumn<SelectTitle<Attribute> | string, "eq">
	readonly active_from: DateRangeColumn
}

type StatusQueryAttribute<Attribute extends AttributeDef> = QueryColumn<
	StatusTitle<Attribute> | string,
	"eq"
> & {
	readonly status: QueryColumn<StatusTitle<Attribute> | string, "eq">
	readonly active_from: DateRangeColumn
}

type QueryAttribute<
	Attribute extends AttributeDef,
	Objects extends ObjectQueryFields = {},
	Depth extends QueryDepth = readonly [],
> =
	AttributeKind<Attribute> extends "text"
		? TextQueryAttribute
		: AttributeKind<Attribute> extends "number" | "rating"
			? NumberQueryAttribute
			: AttributeKind<Attribute> extends "currency"
				? CurrencyQueryAttribute
				: AttributeKind<Attribute> extends "date" | "timestamp"
					? DateQueryAttribute
					: AttributeKind<Attribute> extends "checkbox"
						? CheckboxQueryAttribute
						: AttributeKind<Attribute> extends "domain"
							? DomainQueryAttribute
							: AttributeKind<Attribute> extends "email-address"
								? EmailAddressQueryAttribute
								: AttributeKind<Attribute> extends "personal-name"
									? PersonalNameQueryAttribute
									: AttributeKind<Attribute> extends "location"
										? LocationQueryAttribute
										: AttributeKind<Attribute> extends "phone-number"
											? PhoneNumberQueryAttribute
											: AttributeKind<Attribute> extends "interaction"
												? InteractionQueryAttribute
												: AttributeKind<Attribute> extends "actor-reference"
													? ActorReferenceQueryAttribute
													: AttributeKind<Attribute> extends "record-reference"
														? RecordReferenceQueryAttribute<
																Attribute,
																Objects,
																Depth
															>
														: AttributeKind<Attribute> extends "select"
															? SelectQueryAttribute<Attribute>
															: AttributeKind<Attribute> extends "status"
																? StatusQueryAttribute<Attribute>
																: never

type QueryFields<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields = {},
	Depth extends QueryDepth = readonly [],
> = {
	readonly [Key in keyof Fields]: QueryAttribute<Fields[Key], Objects, Depth>
}

type QueryCallback<
	Result,
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	ParentObject extends Extract<keyof Objects, string>,
> = [ParentObject] extends [never]
	? (
			fields: QueryFields<Fields, Objects>,
			operators: typeof queryOperators,
		) => Result
	: (
			fields: QueryFields<Fields, Objects>,
			parent: QueryFields<Objects[ParentObject], Objects, readonly [unknown]>,
			operators: typeof queryOperators,
		) => Result

type NativePathSegment = readonly [resource: string, attribute: string]
type NativePath = readonly [
	NativePathSegment,
	NativePathSegment?,
	NativePathSegment?,
	NativePathSegment?,
	NativePathSegment?,
]

type NativePathDescriptor<
	Attribute extends AttributeDef,
	Path extends NativePath,
> = {
	readonly attribute: Attribute
	readonly path: Path
}

type NativePathDescriptorsFrom<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	Prefix extends ReadonlyArray<NativePathSegment>,
> = {
	readonly [Key in Extract<keyof Fields, string>]:
		| NativePathDescriptor<
				Fields[Key],
				Extract<readonly [...Prefix, readonly [Resource, Key]], NativePath>
		  >
		| (Prefix["length"] extends 4
				? never
				: AttributeKind<Fields[Key]> extends "record-reference"
					? ReferenceTarget<Fields[Key]> extends infer Target extends Extract<
							keyof Objects,
							string
						>
						? NativePathDescriptorsFrom<
								Objects[Target],
								Objects,
								Target,
								readonly [...Prefix, readonly [Resource, Key]]
							>
						: never
					: never)
}[Extract<keyof Fields, string>]

type NativeRecordPathDescriptors<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
> = {
	readonly [Key in Extract<keyof Fields, string>]: AttributeKind<
		Fields[Key]
	> extends "record-reference"
		? ReferenceTarget<Fields[Key]> extends infer Target extends Extract<
				keyof Objects,
				string
			>
			? NativePathDescriptorsFrom<
					Objects[Target],
					Objects,
					Target,
					readonly [readonly [Resource, Key]]
				>
			: never
		: never
}[Extract<keyof Fields, string>]

type NativeParentPathDescriptors<
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> = [ParentObject] extends [never]
	? never
	: NativePathDescriptorsFrom<
			Objects[ParentObject],
			Objects,
			ParentObject,
			readonly [readonly [Resource, "parent_record"]]
		>

type NativePathDescriptors<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> =
	| NativeRecordPathDescriptors<Fields, Objects, Resource>
	| NativeParentPathDescriptors<Objects, Resource, ParentObject>

type NativeOperatorName<Operator extends ComparisonOperator> =
	Operator extends "notEmpty"
		? "$not_empty"
		: Operator extends "startsWith"
			? "$starts_with"
			: Operator extends "endsWith"
				? "$ends_with"
				: `$${Operator}`

type NativeOperatorValue<
	Column extends AnyColumn,
	Operator extends ComparisonOperator,
> = Operator extends "in"
	? ReadonlyArray<ColumnValue<Column>>
	: Operator extends "notEmpty"
		? true
		: ColumnValue<Column>

type NativeComparison<Column extends AnyColumn> = {
	readonly [
		Operator in ColumnOperators<Column> as NativeOperatorName<Operator>
	]?: NativeOperatorValue<Column, Operator>
}

type NativeColumnFilter<Column extends AnyColumn> =
	| ColumnValue<Column>
	| NativeComparison<Column>

type QueryAttributeField<Attribute> = {
	readonly [Field in keyof Attribute]: Attribute[Field] extends AnyColumn
		? Field
		: never
}[keyof Attribute]

type NativeAttributeFields<Attribute> = {
	readonly [
		Field in QueryAttributeField<Attribute>
	]?: Attribute[Field] extends AnyColumn
		? NativeColumnFilter<Attribute[Field]>
		: never
}

type NativeAttributeFilter<Attribute> =
	| (Attribute extends AnyColumn ? NativeColumnFilter<Attribute> : never)
	| NativeAttributeFields<Attribute>

type NativeAttributeFilters<Fields extends Record<string, AttributeDef>> = {
	readonly [Key in keyof Fields]?: NativeAttributeFilter<
		QueryAttribute<Fields[Key]>
	>
}

type UncheckedNativePathFilter = {
	readonly path: NativePath
	readonly constraints: Readonly<Record<string, Json>>
}

type CheckedNativePathFilter<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> =
	NativePathDescriptors<
		Fields,
		Objects,
		Resource,
		ParentObject
	> extends infer Descriptor
		? Descriptor extends NativePathDescriptor<infer Attribute, infer Path>
			? {
					readonly path: Path
					readonly constraints: NativeAttributeFilter<
						QueryAttribute<Attribute, Objects>
					>
				}
			: never
		: never

type NativePathFilter<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> = string extends keyof Objects
	? UncheckedNativePathFilter
	: CheckedNativePathFilter<Fields, Objects, Resource, ParentObject>

type NativeQueryCondition<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> =
	| NativeAttributeFilters<Fields>
	| NativePathFilter<Fields, Objects, Resource, ParentObject>

export type NativeQueryFilter<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields = ObjectQueryFields,
	Resource extends string = string,
	ParentObject extends Extract<keyof Objects, string> = never,
> =
	| NativeQueryCondition<Fields, Objects, Resource, ParentObject>
	| {
			readonly $and: ReadonlyArray<
				NativeQueryFilter<Fields, Objects, Resource, ParentObject>
			>
	  }
	| {
			readonly $or: ReadonlyArray<
				NativeQueryFilter<Fields, Objects, Resource, ParentObject>
			>
	  }
	| {
			readonly $not: NativeQueryCondition<
				Fields,
				Objects,
				Resource,
				ParentObject
			>
	  }

type NativeSortField<Attribute> = Extract<
	QueryAttributeField<Attribute>,
	string
>

type NativeAttributeSort<Fields extends Record<string, AttributeDef>> = {
	readonly [Key in Extract<keyof Fields, string>]: {
		readonly direction: "asc" | "desc"
		readonly attribute: Key
		readonly field?: NativeSortField<QueryAttribute<Fields[Key]>>
	}
}[Extract<keyof Fields, string>]

type UncheckedNativePathSort = {
	readonly direction: "asc" | "desc"
	readonly path: NativePath
	readonly field?: string
}

type CheckedNativePathSort<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> =
	NativePathDescriptors<
		Fields,
		Objects,
		Resource,
		ParentObject
	> extends infer Descriptor
		? Descriptor extends NativePathDescriptor<infer Attribute, infer Path>
			? {
					readonly direction: "asc" | "desc"
					readonly path: Path
					readonly field?: NativeSortField<QueryAttribute<Attribute, Objects>>
				}
			: never
		: never

type NativePathSort<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> = string extends keyof Objects
	? UncheckedNativePathSort
	: CheckedNativePathSort<Fields, Objects, Resource, ParentObject>

type NativeQueryFields<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields,
	Resource extends string,
	ParentObject extends Extract<keyof Objects, string>,
> = {
	readonly sorts?: ReadonlyArray<
		| NativeAttributeSort<Fields>
		| NativePathSort<Fields, Objects, Resource, ParentObject>
	>
	readonly limit?: number
	readonly offset?: number
}

export type NativeQueryParams<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields = ObjectQueryFields,
	Resource extends string = string,
	ParentObject extends Extract<keyof Objects, string> = never,
> = NativeQueryFields<Fields, Objects, Resource, ParentObject> &
	(
		| {
				readonly filter?: NativeQueryFilter<
					Fields,
					Objects,
					Resource,
					ParentObject
				>
				readonly filter_view_id?: never
		  }
		| {
				readonly filter?: never
				readonly filter_view_id?: string
		  }
	)

export interface QueryBuilderOptions<
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields = ObjectQueryFields,
	ParentObject extends Extract<keyof Objects, string> = never,
> {
	readonly where?: QueryCallback<QueryExpression, Fields, Objects, ParentObject>
	readonly orderBy?: QueryCallback<
		QueryOrder | ReadonlyArray<QueryOrder>,
		Fields,
		Objects,
		ParentObject
	>
	readonly limit?: number
	readonly offset?: number
}

type ComparisonNode = {
	readonly _tag: "Comparison"
	readonly column: ColumnDescriptor
	readonly operator: `$${
		| "eq"
		| "in"
		| "not_empty"
		| "contains"
		| "starts_with"
		| "ends_with"
		| "lt"
		| "lte"
		| "gt"
		| "gte"}`
	readonly value: unknown
}

type ExpressionNode =
	| ComparisonNode
	| {
			readonly _tag: "Logical"
			readonly operator: "$and" | "$or"
			readonly expressions: ReadonlyArray<ExpressionNode>
	  }
	| {
			readonly _tag: "Not"
			readonly expression: ComparisonNode
	  }

const column = (
	descriptor: ColumnDescriptor,
	context: QueryRuntimeContext,
): AnyColumn =>
	new Proxy({} as AnyColumn, {
		get(_target, property) {
			if (property === ColumnType) return { descriptor }
			if (property === "attributes" && descriptor.referenceTarget) {
				const target = descriptor.referenceTarget
				const pathPrefix =
					descriptor.path ??
					(descriptor.resource
						? [[descriptor.resource, descriptor.attribute] as const]
						: [])

				return fields({
					resource: target,
					fields: context.objects?.[target]?.fields,
					objects: context.objects,
					pathPrefix,
				})
			}
			if (typeof property === "string") {
				return column({ ...descriptor, field: property }, context)
			}
		},
	})

interface QueryRuntimeContext {
	readonly resource?: string
	readonly parentResource?: string
	readonly pathPrefix?: ReadonlyArray<
		readonly [resource: string, attribute: string]
	>
	readonly fields?: Readonly<Record<string, AttributeDef>>
	readonly objects?: Readonly<
		Record<string, { readonly fields?: Readonly<Record<string, AttributeDef>> }>
	>
}

const fields = <
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields = {},
>(
	context: QueryRuntimeContext,
) =>
	new Proxy({} as QueryFields<Fields, Objects>, {
		get(_target, property) {
			if (typeof property === "string") {
				return column(
					{
						attribute: property,
						resource: context.resource,
						referenceTarget: context.fields?.[property]?.referenceTarget,
						path:
							context.pathPrefix && context.resource
								? [...context.pathPrefix, [context.resource, property] as const]
								: undefined,
					},
					context,
				)
			}
		},
	})

const comparison = <Column extends AnyColumn>(
	column: Column,
	operator: ComparisonNode["operator"],
	value: unknown,
): QueryComparisonExpression => ({
	[ExpressionType]: {
		_tag: "Comparison",
		column: column[ColumnType].descriptor,
		operator,
		value,
	},
})

const queryOperators = {
	eq: <Column extends AnyColumn>(
		column: Supports<Column, "eq">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$eq", value),
	inArray: <Column extends AnyColumn>(
		column: Supports<Column, "in">,
		values: ReadonlyArray<ColumnValue<Column>>,
	): QueryComparisonExpression => comparison(column, "$in", values),
	isNotEmpty: <Column extends AnyColumn>(
		column: Supports<Column, "notEmpty">,
	): QueryComparisonExpression => comparison(column, "$not_empty", true),
	contains: <Column extends AnyColumn>(
		column: Supports<Column, "contains">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$contains", value),
	startsWith: <Column extends AnyColumn>(
		column: Supports<Column, "startsWith">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$starts_with", value),
	endsWith: <Column extends AnyColumn>(
		column: Supports<Column, "endsWith">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$ends_with", value),
	lt: <Column extends AnyColumn>(
		column: Supports<Column, "lt">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$lt", value),
	lte: <Column extends AnyColumn>(
		column: Supports<Column, "lte">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$lte", value),
	gt: <Column extends AnyColumn>(
		column: Supports<Column, "gt">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$gt", value),
	gte: <Column extends AnyColumn>(
		column: Supports<Column, "gte">,
		value: ColumnValue<Column>,
	): QueryComparisonExpression => comparison(column, "$gte", value),
	and: (...expressions: ReadonlyArray<QueryExpression>): QueryExpression => ({
		[ExpressionType]: {
			_tag: "Logical",
			operator: "$and",
			expressions: expressions.map((expression) => expression[ExpressionType]),
		},
	}),
	or: (...expressions: ReadonlyArray<QueryExpression>): QueryExpression => ({
		[ExpressionType]: {
			_tag: "Logical",
			operator: "$or",
			expressions: expressions.map((expression) => expression[ExpressionType]),
		},
	}),
	not: (expression: QueryComparisonExpression): QueryExpression => ({
		[ExpressionType]: {
			_tag: "Not",
			expression: expression[ExpressionType],
		},
	}),
	asc: (column: AnyColumn): QueryOrder => ({
		[OrderType]: { column: column[ColumnType].descriptor, direction: "asc" },
	}),
	desc: (column: AnyColumn): QueryOrder => ({
		[OrderType]: { column: column[ColumnType].descriptor, direction: "desc" },
	}),
}

const compileExpression = (node: ExpressionNode): Record<string, Json> => {
	switch (node._tag) {
		case "Comparison": {
			const constraint: Record<string, Json> = {
				[node.operator]: node.value as Json,
			}
			if (node.column.path) {
				return {
					path: node.column.path,
					constraints: node.column.field
						? { [node.column.field]: constraint }
						: constraint,
				}
			}
			return {
				[node.column.attribute]: node.column.field
					? { [node.column.field]: constraint }
					: constraint,
			}
		}
		case "Logical":
			return {
				[node.operator]: node.expressions.map(compileExpression),
			}
		case "Not":
			return { $not: compileExpression(node.expression) }
	}
}

export const compileQueryBuilderOptions = <
	Fields extends Record<string, AttributeDef>,
	Objects extends ObjectQueryFields = ObjectQueryFields,
	ParentObject extends Extract<keyof Objects, string> = never,
>(
	options: QueryBuilderOptions<Fields, Objects, ParentObject> = {},
	context: QueryRuntimeContext = {},
) => {
	const queryFields = fields<Fields, Objects>(context)
	let where: QueryExpression | undefined
	let orderBy: QueryOrder | ReadonlyArray<QueryOrder> | undefined

	if (context.parentResource) {
		const parentFields = fields<Record<string, AttributeDef>, Objects>({
			resource: context.parentResource,
			fields: context.objects?.[context.parentResource]?.fields,
			objects: context.objects,
			pathPrefix: context.resource
				? [[context.resource, "parent_record"]]
				: undefined,
		})
		const whereCallback = options.where as unknown as
			| ((
					fields: QueryFields<Fields, Objects>,
					parent: QueryFields<Record<string, AttributeDef>, Objects>,
					operators: typeof queryOperators,
			  ) => QueryExpression)
			| undefined
		const orderByCallback = options.orderBy as unknown as
			| ((
					fields: QueryFields<Fields, Objects>,
					parent: QueryFields<Record<string, AttributeDef>, Objects>,
					operators: typeof queryOperators,
			  ) => QueryOrder | ReadonlyArray<QueryOrder>)
			| undefined

		where = whereCallback?.(queryFields, parentFields, queryOperators)
		orderBy = orderByCallback?.(queryFields, parentFields, queryOperators)
	} else {
		const whereCallback = options.where as unknown as
			| ((
					fields: QueryFields<Fields, Objects>,
					operators: typeof queryOperators,
			  ) => QueryExpression)
			| undefined
		const orderByCallback = options.orderBy as unknown as
			| ((
					fields: QueryFields<Fields, Objects>,
					operators: typeof queryOperators,
			  ) => QueryOrder | ReadonlyArray<QueryOrder>)
			| undefined

		where = whereCallback?.(queryFields, queryOperators)
		orderBy = orderByCallback?.(queryFields, queryOperators)
	}
	const orders: ReadonlyArray<QueryOrder> | undefined =
		orderBy === undefined
			? undefined
			: Array.isArray(orderBy)
				? orderBy
				: [orderBy as QueryOrder]

	return {
		filter: where ? compileExpression(where[ExpressionType]) : undefined,
		sorts: orders?.map((order) => {
			const value = order[OrderType]
			if (value.column.path) {
				return {
					direction: value.direction,
					path: value.column.path,
					...(value.column.field ? { field: value.column.field } : {}),
				}
			}
			return {
				direction: value.direction,
				attribute: value.column.attribute,
				...(value.column.field ? { field: value.column.field } : {}),
			}
		}),
		limit: options.limit,
		offset: options.offset,
	}
}
