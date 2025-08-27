---
"effect-attio": patch
---

fix: make entry update/patch data parameter partial

Allow partial updates for entry values in update and patch methods by changing the data parameter type from requiring full entry_values to accepting Partial<Schema.Schema.Type<TInput>>