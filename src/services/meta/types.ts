import type * as Schema from "effect/Schema"
import type * as Schemas from "./schemas.js"

// exported types for public consumption
export type TokenInfo = Schema.Schema.Type<typeof Schemas.TokenInfo>
export type InactiveToken = Schema.Schema.Type<typeof Schemas.InactiveToken>
export type TokenInfoResponse = Schema.Schema.Type<typeof Schemas.TokenInfoResponse>