---
"effect-attio": minor
---

**Breaking:** `threads.get` now returns one page of comments as `{ data, pagination }` and not the thread alone. Use the new `limit` and `cursor` parameters to page through comments, and `created_after` to get only newer comments. A thread from `threads.get` can have no comments when `created_after` excludes all of them. Threads from `threads.list` now include `has_more_comments`.
