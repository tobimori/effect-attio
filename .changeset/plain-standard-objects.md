---
"effect-attio": patch
---

Fix the standard object schemas to match Attio: remove `associated_users` from companies, which Attio does not have, and rename the deals `state` attribute to `stage`. Before, companies records failed to decode when the users object was enabled, and deal records always failed to decode.
