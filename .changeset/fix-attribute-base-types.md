---
"effect-attio": patch
---

fix: add BaseAttribute fields to attribute types and use DateTimeUtc

The BaseAttribute fields (active_from, active_until, created_by_actor) were being added at runtime but weren't visible at the type level. This patch ensures these metadata fields are properly reflected in the TypeScript types. Also updates active_from and active_until from String to DateTimeUtc for proper timestamp handling.