---
"effect-attio": minor
---

**Breaking:** `comments.create` now uses the input that Attio accepts: `format`, `content`, `author`, an optional `created_at`, and one of `thread_id`, `record` or `entry`. The old input always failed. Comments on list entries now decode `entry.entry_id`.
