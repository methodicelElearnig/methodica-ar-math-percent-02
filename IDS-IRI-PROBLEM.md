# Using an IRI as the component / item ID in KATA — findings and argument

**Unit:** `methodica-math-percent-02` · **Date:** 2026-09-15 (rev. 3) · **Author:** Methodic (Vadim Rozhansky)
**Status:** **the component blocker is resolved** — KATA shipped the API change on 2026-09-15. One
risk remains open (§7.2, runtime). Nothing on the seven live components has been changed.

---

## 1. Bottom line

> **RESOLVED, 2026-09-15 — by a change on KATA's side, not a workaround on ours.** KATA shipped
> exactly what its team proposed: a complete query-string route family for components,
> `/api/v1/component?componentKey=…`, twelve operations covering read, update, delete, preview,
> publish, unpublish and every item operation beneath a component. A key containing `/` is routable
> as a query parameter, so **a full URL IRI now works as a component key.** The trap this report was
> written about is gone. The component stranded in §11 was recovered by that release and then
> deleted (§11) — the unit now returns zero `identifier_not_iri` warnings.
>
> Two things this did *not* settle, and they are why the report is kept rather than retired:
> **§7.2 — whether the runtime (launcher, state, statements) accepts a non-slug component key — is
> still untested and still the deciding risk on a live unit.** And KATA's answer to Q1 turns out to
> be that our current slugs are **not** compliant (see below), which makes this a task rather than a
> closed question.

720 v2.5 requires a component's and an item's `id` to be an IRI. KATA's catalogue shows a bare slug
(`methodica-math-percent-02-01`) in the `מזהה רכיב` field. We asked whether that can be changed to
the IRI our metadata carries.

**Both levels can now hold a full URL IRI. What differs is only which route you address them
through** — and that is now a documentation problem rather than a data-loss problem.

**Items: yes, an IRI works** — as established in rev. 2, through
`/api/v1/components/{unique_key}/item?itemKey=…`, and now also through
`/api/v1/component/item?componentKey=…&itemKey=…`, which is the only form that works when the
*component* key is an IRI too.

**Components: yes, as of 2026-09-15.** KATA accepts a full URL IRI as `uniqueKey`, stores it
faithfully, and the component is now fully manageable through the singular `/api/v1/component`
routes. Previously it became permanently unreachable — every component route carried the key as a
path segment and none had a query-string equivalent. That asymmetry is what the new routes remove.

**And KATA has now answered Q1, in the form of a machine-readable warning rather than prose.** Every
`ComponentOut` and `ItemOut` carries a new `warnings[]` array, and every slug-keyed row in this unit
returns:

```json
{ "code": "identifier_not_iri", "field": "uniqueKey",
  "message": "uniqueKey should be an absolute IRI — a full URL (https://…) or a URN (urn:…) — per Ministry 720 v2.5 p.11; short strings, slugs and plain numbers are rejected by an LRS. Advisory for now." }
```

So the slug **is** treated as non-compliant, the catalogue row itself is expected to carry the IRI,
and "advisory for now" is the only notice we will get before it stops being advisory. The live tree
returns 34 of these warnings — 7 components and 27 items. The probe component in §11, whose key *is*
an IRI, returns none, which confirms the check is genuinely evaluating IRI-ness and not merely
tagging every row.

| Question | Answer |
|---|---|
| Can a component ID be a full URL IRI in KATA? | **Yes, since 2026-09-15** — via `/api/v1/component?componentKey=…`. Before that: stored but unreachable |
| Does the same apply to item IDs? | **Yes** — and it always did, through the `?itemKey=` route |
| Is there an IRI form that works for components? | **Both.** A URL IRI via the query routes; a URN via either |
| Is the current slug non-compliant? | **Yes — KATA now says so**, via `identifier_not_iri`. Advisory today, not forever |
| Is it safe to change the keys on this live unit? | **Not yet established** — §7.2 is unchanged and untested |

> **CORRECTION, 2026-09-14.** An earlier revision of this report said an IRI item key strands the
> item exactly as it strands a component. **That was wrong**, and the KATA team (Ofir) was right to
> say items can be IRIs. My probes had only exercised the *path* route
> `/api/v1/components/{unique_key}/items/{item_key}`. The live API also exposes a **singular
> query-string route**, `/api/v1/components/{unique_key}/item?itemKey=…`, for `GET`, `PATCH` and
> `DELETE` — and a query parameter carries `/` without difficulty once percent-encoded. Re-tested
> end to end: an IRI-keyed item can be read, patched, renamed back to a slug, and deleted. §5.1
> and §7 below are corrected.
>
> **Superseded in part, 2026-09-15.** The paragraph that followed here said the component finding
> was unchanged — that every component route carries the key as a path segment with no query-string
> equivalent. **That is no longer true.** Ofir's proposed fix has shipped, and the component now has
> the same query-string escape hatch as the item. §5.1, §6, §7.1, §8, §10 and §11 are updated.
## 2. What the standard requires

**720 v2.5, p.11** — *"הגדרת מזהי רכיבים, פריטים (ID) במטא-דאטה על פי תקן xAPI"*:

> כל פריט או רכיב תוכן (המשמש כ-object בדיווח) חייב להיות מזוהה באמצעות מזהה ייחודי תקני מסוג IRI
> (לרוב מיוצג ככתובת אינטרנט מלאה - URL, **או כ-URN**). מזהה זה משמש כמחרוזת ייחודית גלובלית
> **ואינו חייב להוביל בפועל לדף אינטרנט פעיל.**

and:

> שדה ה-id במטא-דאטה של התוכן שלכם חייב להיות מוגדר מראש בפורמט של כתובת מלאה או URN. אין להשתמש
> בטקסט חופשי, מחרוזות קצרות או מספרים פשוטים, שכן אלו יידחו על ידי ה-LRS.

Three points matter for the argument:

1. **A URN is explicitly allowed**, on equal footing with a URL. This is decisive — see §6.
2. **The IRI need not resolve.** So "there is no such page on the CDN" is not an objection to any
   identifier form.
3. The clause governs **"שדה ה-id במטא-דאטה"** — the `id` field in *the metadata*. Whether it also
   governs KATA's internal `uniqueKey` column is precisely what is ambiguous. See §8, Q1.

**v2.5 §2.7** dropped the IRI requirement for the **content unit** id only. `CHANGES-IN-2.5-VS-2.4.md:80`
is explicit that for component and item the v2.2 obligation stands, and that v2.5 even corrected its
examples to full URLs.

### Is a URN actually supported? Yes — on both sides

> **Context, 2026-09-15.** This subsection was written while a URN was the *only* IRI form a
> component key could take. It is still factually correct — a URN is supported by the standard and
> by KATA — but it is no longer the recommendation: since the query routes shipped, a URL IRI works
> for components too, and a URN would leave the catalogue key differing from `metadata/` and from
> every statement already sent. See §8, where option B is withdrawn. Kept because the p.11 reading
> below is still the basis for the whole argument.

This gets doubted, so the evidence is worth stating plainly.

**In the standard.** URN is not an inference; it appears **twice on p.11**, once in the definition
and once in the mandatory sentence:

> …מזהה ייחודי תקני מסוג IRI (לרוב מיוצג ככתובת אינטרנט מלאה - URL, **או כ-URN**)

> שדה ה-id במטא-דאטה של התוכן שלכם חייב להיות מוגדר מראש בפורמט של כתובת מלאה **או URN**

Both sentences put URL and URN on equal footing. Nothing in v2.5 prefers one. The example given
(`https://your-domain.com/content/question_456`) is illustrative — the prose beside it is the rule,
and it admits both forms.

**In KATA.** `uniqueKey` is declared as `string` with `minLength: 1` and **no `pattern` and no
`format`** (see §5.2), so a URN is schema-valid by construction — there is nothing for it to
violate. And it works in practice, tested at both levels: stored, addressable by the raw *and* the
%-escaped key, renameable back, and the parent's items stay reachable throughout (§5.1).

**The honest qualification:** KATA does not *document* URN specifically, because it does not
document any `uniqueKey` format at all. So "supported" is true in the sense that matters — accepted,
stored and addressable — but it is not a commitment KATA has published. That is exactly why §10 Q2
asks them to confirm it rather than treating our probe as sufficient.

### Does a URN key force a change to the xAPI activity ids?

**No — a URN is already a valid xAPI activity id, and no transformation is needed.**

xAPI requires an Activity's `id` to be an IRI. A URN is a URI (RFC 8141), and RFC 3987 §3.1 defines
every URI as an IRI. So `urn:lomdot:…` and `https://lomdot…/` are *equally* legal as `object.id`.
There is no "IRI vs URN" choice to make in xAPI terms — a URN **is** an IRI.

What would or would not have to change depends on which option is taken:

| | statements / `unit-js` | `metadata/` | KATA key |
|---|---|---|---|
| **E — URL IRI on item keys** | **unchanged** | **unchanged** | items: the same URL IRI as `metadata/` |
| **D — URL IRI on component keys too** (available since 2026-09-15) | **unchanged** | **unchanged** | components: the same URL IRI as `metadata/` |
| **B — URN on component keys** *(withdrawn, §8)* | **unchanged** | **unchanged** (URL IRI) | components: URN |
| **C — URN everywhere** | `XAPI_ID_PREFIX`, `xapiItemId()` | 7 component + 26 item ids, 42 `questionId`s | URN |

**Option D is the one that now makes every layer agree** without touching a single line of
`unit-js` or `metadata/`: the catalogue key becomes byte-identical to the metadata `id` and to the
`object.id` already in every statement. That is the same argument as option E, extended to
components — and it is available only because the key no longer has to survive a path segment.

Option E changes nothing outside KATA at all — it makes the catalogue's item key equal to the
`metadata/` id and to the `object.id` already being reported, which is strictly more consistent than
today.

Option B needs no code change because **the coupling that is actually enforced is
statements ↔ `metadata/`, not statements ↔ KATA.** The loader gate at `unit-js/50-loader.js:202`
compares `window.METADATA.id` with `XAPI_COMP_ID` on every load, and `_test/verify-shared.js`
asserts the same equality statically. KATA's `uniqueKey` appears in neither check.

**And here is the observation that matters most for the risk assessment:** `object.id` has *never*
equalled `uniqueKey` on this unit. Statements have always carried
`https://…/methodica-math-percent-02-01/` while the catalogue row has always been keyed
`methodica-math-percent-02-01`. The unit has been live since 2026-09-10 and its reporting was
verified end to end in that state. So KATA is evidently **not** joining `object.id` to `uniqueKey` —
if it were, reporting would already have been broken from the first statement.

That is an inference, not a proof: we can confirm statements were accepted and that resume works
(resume is addressed by `componentKey` and is independent of `object.id`), but we cannot see how
KATA attributes them internally, because `GET /xapi/statements` is closed to us (§10 Q5). It does,
however, shift the burden — §10 Q3 is now asking KATA to confirm something the live evidence
already suggests.

Option C is the internally consistent end state, but on *this* unit it is expensive: it changes the
activity ids of a unit that is already reporting real learner data, so statements before and after
would describe the same activity under two identifiers. It also drops the trailing-slash convention
(a URN has no path), which §4.2 of the reporting spec singles out as a trap that has been got wrong
in both directions. It is the right choice for a unit that has not shipped yet.

### Our metadata already complies

All 7 component ids and all 26 item ids in `metadata/*.json` are absolute IRIs:

```
component  https://lomdot.education.gov.il/metodica/720active/math/percent/02/methodica-math-percent-02-01/
item       https://lomdot.education.gov.il/metodica/720active/math/percent/02/methodica-math-percent-02-01/methodica-math-percent-02-01-001/
question   https://…/methodica-math-percent-02-01-004/q1
```

The lomda reports those same strings as `object.id` in every xAPI statement
(`unit-js/20-xapi.js:26`), and `_test/verify-shared.js:694-697` asserts byte equality between the
two. So the metadata side and the reporting side are already consistent and compliant. **The
question is only about what the catalogue stores.**

---

## 3. What KATA's data model offers

A component or item in KATA has **no `id` field at all**. The identifier-bearing fields are:

| Field | Role | Today |
|---|---|---|
| `uniqueKey` | the entity's identity **and its URL path segment** | bare slug |
| `hostedContentRef` | "כתובת תוכן מתארח" — a content URL | component: `…/methodica-math-percent-02-01/index.html`; item: was `null`, now the item IRI |

Because there is no `id` column, the IRI from `metadata/` had nowhere to go. Our sender
(`docs-and-tools/send-metadata.ps1:229`) reduced each IRI to its last path segment via `Get-Slug`,
which is why the catalogue shows a slug. That is a consequence of KATA's schema, not a bug in the
metadata.

---

## 4. How this was tested

All experiments ran against **throwaway components created for the purpose**, never against the
seven live ones. Scripts are committed and re-runnable:

| Script | What it settles |
|---|---|
| `docs-and-tools/probe-kata-api.ps1` | general write semantics — what PATCH honours |
| `docs-and-tools/probe-iri-component-key.ps1` | URL IRI as a **component** key: addressability, reversibility |
| `docs-and-tools/probe-iri-item-key.ps1` | URL IRI **and URN** as an **item** key (path route), then URN as a component key |
| `docs-and-tools/probe-item-querystring.ps1` | **the correction** — an IRI item key addressed via `?itemKey=` instead of the path |

Each probe records the HTTP status **and a follow-up GET**, because "HTTP 200 and silently ignored"
is a real failure mode in this API and only the read-back distinguishes it.

---

## 5. Results

### 5.1 The key matrix

**The route matters as much as the value** — that was the finding in rev. 2 and it still is. What
changed on 2026-09-15 is that a route now exists for every combination, so no value strands anything
any more.

**Components.** Two families now, and the choice is forced by the key shape:

| `uniqueKey` value | path `/components/{unique_key}` | query `/component?componentKey=…` |
|---|---|---|
| slug (today) | 200 | **200** ✔ re-verified 2026-09-15 |
| URN | 200 | 200 (schema-identical route; not re-probed) |
| **URL IRI** | **404** ✔ still fails, as designed | **200** ✔ **verified 2026-09-15** |

**Items.** The component key the item sits under matters as much as the item's own key:

| component key | route | item key | result |
|---|---|---|---|
| slug | `/components/{slug}/items/{item_key}` (both in path) | slug | 200 |
| slug | `/components/{slug}/items/{item_key}` | **URL IRI** | **404** |
| slug | `/components/{slug}/item?itemKey=…` | URL IRI | **200** (rev. 2 finding) |
| **URL IRI** | `/components/{IRI}/item?itemKey=…` | slug | **404** ✔ verified — the *component* key in the path is what fails |
| **URL IRI** | `/component/item?componentKey=…&itemKey=…` | slug | **200** ✔ **verified 2026-09-15** |

The last row is the one that was impossible before: an item beneath an IRI-keyed component. Both
keys travel in the query string, so neither can break routing.

> **Scope of the 2026-09-15 verification — superseded the same day.** The first probes were `GET`
> only, deliberately, because the seven components carry learner data. The writes have since been
> exercised for real: the key migration `PATCH`ed all 33 rows through
> `/api/v1/component?componentKey=` and `/api/v1/component/item?componentKey=&itemKey=`, and the
> stranded probe was removed with `DELETE` (§11), which cascaded to its item. So `GET`, `PATCH` and
> `DELETE` are all confirmed on the query routes against a real unit. `publish`/`unpublish` are
> confirmed on the four *other* units migrated the same day, whose components were published; this
> unit's are all `draft`, so its migration never called them.

> **Undocumented status code.** These routes declare only `200` and `422` in the spec, but an
> unknown key returns **`404`** with a problem-details body:
> `{"type":"about:blank","title":"Not Found","status":404,"code":"resource.not_found","detail":"content not found"}`.
> Client code should not treat a `404` here as "route does not exist".

For a **component**, the exhaustive addressing table from rev. 2 still holds *for the path route* —
every encoding fails, and this is why the query route was needed rather than a cleverer escaping:

```
raw                    https://…/methodica-math-percent-02-00098/     -> 404
%-escaped              https%3A%2F%2F…                                 -> 404
double-escaped         https%253A%252F%252F…                           -> 404
slashes-only encoded   https:%2F%2F…                                   -> 404
without trailing slash …-00098                                         -> 404
the previous slug      methodica-math-percent-02-00098                 -> 404
```

The entity was visible throughout in the whole-tree `GET /content-units/{unitKey}` — the only read
path that does not carry the key in a URL — so it was always stored, and only stored. It is now
reachable directly as well.
### 5.2 Supporting findings

- **`uniqueKey` is mutable by PATCH** at both component and item level. Confirmed in the live
  OpenAPI document: it is a property of both `ComponentUpdate` and `ItemUpdate`. Our local
  `Documentation/KATA/*.md` described it as create-only; those files were regenerated from the
  spec on 2026-09-11 and no longer say that.
- **The API imposes no format on `uniqueKey` whatsoever.** In the spec it is `string` with
  `minLength: 1` and **no `pattern`, no `format`**. A slug, a URN and a full URL IRI are all
  equally *schema-valid* — which is exactly why a URL IRI is accepted with a `200` and only fails
  later, at routing. The failure is not a validation decision; nothing in the contract expresses
  the constraint that actually binds.
- **`DELETE /components/{key}` cascades to its items**, including IRI-keyed orphans — so an item
  stranded under a *slug-keyed* component is recoverable by deleting and recreating the parent.
  A stranded **component** had no such parent and was, until 2026-09-15, unrecoverable; it is now
  addressable and deletable through `DELETE /api/v1/component?componentKey=…` (§5.1, §11).
- Item `hostedContentRef` is accepted at create and patchable, but **cannot be cleared**: `null`
  returns 200 and is silently ignored, `""` returns 422. Setting it is one-way.

---

## 6. Root cause — and how it was fixed

Until 2026-09-15, every authoring endpoint carried the key as a **URL path segment**:

```
/api/v1/components/{unique_key}
/api/v1/components/{unique_key}/items
/api/v1/components/{unique_key}/items/{item_key}
/api/v1/components/{unique_key}/items/order
```

A URL IRI contains `/`. A path segment cannot. Percent-encoding does not rescue it, because the
server decodes `%2F` before routing — which is why even the double-encoded form fails.

The published contract did not express this. `uniqueKey` is declared as a plain `string` with
`minLength: 1` and no `pattern` or `format`, so a URL IRI passes validation cleanly and is stored;
the constraint that actually bound was the routing layer, which the schema said nothing about.

**A URN has no `/`.** `urn:lomdot:metodica:720active:math:percent:02:methodica-math-percent-02-01`
is a single path segment, survives routing, and is a valid IRI under p.11's own wording. That
remains true and is why the URN rows of the matrix were always green.

**The real fix was the second way out, and KATA has now taken it at both levels.** A key that cannot
be a path segment can still be a *query parameter*, where `%2F` is ordinary data rather than a
routing delimiter. That is what `/api/v1/components/{unique_key}/item?itemKey=…` already provided
for items, and as of 2026-09-15 what `/api/v1/component?componentKey=…` provides for components. The
asymmetry was never a property of items versus components — it was purely which routes existed. The
spec now says so in as many words, on every new parameter: *"Carried as a query parameter rather
than a path segment because it may be an IRI/URL (slashes cannot route in a path)."*

**On our §10 Q7 — adding a `pattern` to `uniqueKey` — KATA chose the other answer, and the better
one.** `uniqueKey` still has no `pattern` and no `format`; nothing is rejected. Instead the
identifier is *evaluated* and reported back advisorily, through the new `ContentIdWarning` on every
`ComponentOut` and `ItemOut`. A `pattern` forbidding `/` would have made the old trap a `422` — but
it would also have permanently banned the very IRIs the standard requires. Fixing the routing and
warning on the content is strictly better than validating the symptom, and it is worth recording
that our suggestion was the weaker of the two.
## 7. Blast radius if a URL IRI were applied to the live unit

### 7.1 Authoring — no longer breaks, provided the tooling uses the query routes

**Rewritten 2026-09-15.** This section previously said that giving the seven components URL-IRI keys
would make the unit unmanageable through the API. **That is no longer true** — but it is now
conditional on which routes the tooling calls, and our tooling does not yet call the new ones.

| Operation | Path route after an IRI rename | Query-route equivalent |
|---|---|---|
| read / update / delete a component | `GET/PATCH/DELETE /components/{key}` → **404** | `GET/PATCH/DELETE /component?componentKey=…` |
| add an item | `POST /components/{key}/items` → **404** | `POST /component/items?componentKey=…` |
| read / update / delete an item | `…/items/{item_key}` → **404** | `GET/PATCH/DELETE /component/item?componentKey=…&itemKey=…` |
| item by query under the old route | `…/item?itemKey=…` → **404** (component key still in the path) | as above |
| reorder items | `PUT …/items/order` → **404** | `PUT /component/items/order?componentKey=…` |
| publish / unpublish / preview | → **404** | `/component/publish` · `/unpublish` · `/preview?componentKey=…` |
| whole-tree `GET /content-units/{unitKey}` | works (read-only), unchanged | — |

**The practical consequence is a tooling change, not a data risk.** `send-metadata.ps1` and
`retrieve-metadata.ps1` address components through the path routes throughout, and would return 404
on every call against an IRI-keyed component. They must be moved to `/api/v1/component?componentKey=`
**before** any key is renamed, not after — and `send-metadata.ps1:229` must stop reducing each IRI
to its last path segment via `Get-Slug`, which is the line that produces the slug keys in the first
place.

`recommendedAfterFail` would still have to be rewritten to IRIs as part of the same change, since it
references components by key. It no longer has to happen *before* the rename — the component stays
patchable through the query route — but it does have to happen, and today `-03` points at `-02`.

### 7.2 Runtime — still unknown, and now the only real risk (STILL NOT TESTED)

**Unchanged by the 2026-09-15 release.** Nothing in the new routes touches the runtime, and nothing
in the spec says how the runtime resolves a component key. These endpoints take the key as a query
parameter or a body field, not a path segment, so an IRI could in principle survive there — but
"in principle" is doing the same work it was doing in rev. 2:

| Endpoint | How the key is passed |
|---|---|
| `POST /api/v1/launcher/context` | body field `componentId` |
| `GET/PUT/DELETE /api/v1/xapi/activities/state` | query `componentKey` |
| `GET /api/v1/xapi/statements` | query `componentKey` |

We still **cannot test it**: launching requires a real learner context, and both our tokens are
refused on `GET /xapi/statements` (catalogue key `403`, launch token `401`). KATA's own
documentation examples still use slug-shaped values throughout
(`"componentId": "PRV-your-component-0001"`).

**If launch does not accept a non-slug `componentId`, the unit stops launching for learners.** The
rename itself is now reversible — that is what the query routes bought us — but a live unit that
stops launching while we discover this is not an acceptable way to find out. §10 Q4 and Q5 are
therefore the two questions that still block action, and they are the two that the release did not
answer.

Secondary runtime consequences even if launch works, all unchanged:

- every learner's **resume document** is addressed by `componentKey` — changing the key orphans
  existing state
- existing **launch links** embedding the old `componentId` break
- statements already recorded reference the old component identity
## 8. Options

**Re-scored 2026-09-15.** Option D — the one this report previously advised against in the
strongest terms — is now viable, because the objection to it was routing, and routing is fixed.

| # | Option | Scope | Compliance | Reversible | Cost |
|---|---|---|---|---|---|
| A | **Status quo** — slug `uniqueKey`, full IRI in `hostedContentRef` | both | **no** — KATA now returns `identifier_not_iri` on every row | n/a | none today; 34 warnings and a deadline that has not been named |
| **E** | **URL IRI on the 26 item keys**, components stay slugs | items | yes at item level; components still warn | **yes** | tooling must address items via `?itemKey=` |
| **D** | **URL IRI on component keys too** — the full fix | both | **yes, exactly** — catalogue = `metadata/` = `object.id` | **yes, since 2026-09-15** | tooling must move to `/component?componentKey=`; **runtime unverified (§7.2)** |
| B | **URN on component keys** | components | yes — a URN is an IRI | yes | KATA's key ≠ the URL IRI in `metadata/` and in statements; now pointless — it existed only to dodge routing |
| C | **URN everywhere** — `metadata/`, `XAPI_ID_PREFIX`, KATA | both | yes, internally consistent | metadata yes, statements no | activity ids change on a live unit |

**D is now the right destination, and E is the safe first step toward it.** They are not
alternatives: E changes only item keys, needs nothing from the runtime (items are not launched and
do not address state), and makes 27 of the 34 warnings go away. D then adds the 7 components and
needs §7.2 answered first. Doing E now costs nothing that D would have to undo.

**B is now obsolete.** A URN was only ever attractive because it dodged the path-segment problem.
With the query routes in place it buys nothing and costs consistency — the catalogue key would
differ from `metadata/` and from every statement already sent. Do not adopt it.

**C remains the correct end state for a unit that has not shipped yet** — all three layers agree
byte-for-byte — but on a live unit it still changes activity ids mid-flight. Unchanged.

**Recommendation, revised:**

1. **Do E now.** Move the item tooling to `?itemKey=` and set the 26 item keys to the IRIs already
   in `metadata/`. Reversible, runtime-independent, and it clears most of the warnings.
2. **Get §10 Q4 and Q5 answered** — whether the launcher and state endpoints accept a non-slug
   `componentKey`, and read access to `GET /xapi/statements` so we can see the answer ourselves.
3. **Then do D** on the seven components, tooling first, on a throwaway component before the live
   ones. The one-way door is gone; the runtime unknown is not.

The §8 note about KATA's admin UI being a possible safe path is **withdrawn** — it existed only
because the REST API could not address an IRI-keyed component, and now it can. Q6 is moot.
## 9. What has already been done

Applied 2026-09-11, additive, touching no key and no question:

- **All 26 items now carry their full IRI in `hostedContentRef`** (previously `null` on every one,
  meaning the item's IRI was stored nowhere in KATA at all). The value is byte-identical to the
  `object.id` the runtime reports, so if KATA ever reconciles statements to catalogue rows on a URL,
  the data is there.
- Components already carried theirs, as `…/<component>/index.html`.
- `retrieve-metadata.ps1` gained `-FailOnDrift` and now reports what KATA actually returned instead
  of reconstructing ids from `hostedContentRef` — the previous behaviour is why the missing item
  IRIs went unnoticed through a whole deploy cycle.

---

## 10. Open questions for KATA

**Status as of 2026-09-15.** Three of the seven are answered — two by the release itself, one by the
new warning. The two that actually block action are still open.

| # | Question | Status |
|---|---|---|
| 1 | Does slug `uniqueKey` + full-IRI `hostedContentRef` satisfy v2.5 p.11? | **Answered: no.** Delivered as `identifier_not_iri` on every slug-keyed row — the catalogue row is expected to carry the IRI. "Advisory for now" |
| 2 | Is a URN the intended form when an IRI is required? | **Moot.** A URL IRI now works; the URN existed only to dodge the path segment. See §8 |
| 3 | Does KATA reconcile a statement's `object.id` to a catalogue row, and on which field? | **Still open.** Unanswerable from our side without Q5 |
| 4 | Do `launcher/context` (`componentId`) and the state/statements endpoints (`componentKey`) work with a non-slug key? | **STILL OPEN — and now the blocker.** §7.2. The catalogue accepts IRI keys; nothing says the runtime resolves them |
| 5 | Can a Methodica key read `GET /api/v1/xapi/statements`? | **Still open.** Catalogue key `403`, launch token `401` |
| 6 | Can the admin UI delete an entity whose key is a URL IRI? | **Moot.** The REST API can now — see §11 |
| 7 | Would you add a `pattern` to `uniqueKey`? | **Answered, and better than we asked.** No pattern; instead the key is evaluated and reported advisorily via `ContentIdWarning`. A pattern forbidding `/` would have banned the IRIs the standard requires. See §6 |

**What we would still ask, in one sentence:** Q4 and Q5 — *does the runtime accept an IRI
`componentKey`, and may we have read access to `GET /xapi/statements` so we can confirm it
ourselves?* Everything else can proceed without KATA.

**One thing worth flagging back to them:** the new routes declare only `200` and `422` in the spec,
but return `404` for an unknown key (§5.1). Minor, but a client written strictly against the spec
would mishandle it.
## 11. Appendix — the stranded component (recovered and deleted, 2026-09-15)

Produced while establishing §5.1, on a throwaway entity. It was stranded for four days, recovered by
the 2026-09-15 release, and **deleted the same day. It no longer exists.** The request to KATA to
remove it on our behalf is withdrawn — the routes they shipped are what let us do it ourselves.

Its whole life, for the record: created 2026-09-11T11:12:03Z by `probe-iri-component-key.ps1`
(which hard-codes the title and `order = 98`), renamed to a URL IRI to test whether the key would
survive, then left unreachable when the probe's cleanup tried to DELETE it by its *stale* slug —
the exact trap the probe was written to demonstrate, sprung on the probe itself. That is the
finding §6 and the note to KATA were built on.

```
order        98
uniqueKey    https://lomdot.education.gov.il/metodica/720active/math/percent/02/methodica-math-percent-02-00098/
title        PROBE IRI-KEY — safe to delete
status       draft
isRequired   false     isAssessment  false
hostedContentRef  null   (nothing can launch it)
items 1 (methodica-math-percent-02-00098-001) · questions 0
warnings []   ← its key IS an IRI, so it is the one component in this unit that does not warn
```

Verified live on 2026-09-15, `GET` only:

```
GET /api/v1/component?componentKey=https%3A%2F%2F…%2Fmethodica-math-percent-02-00098%2F   -> 200
GET /api/v1/component/item?componentKey=…&itemKey=methodica-math-percent-02-00098-001     -> 200
GET /api/v1/components/{that IRI}/item?itemKey=…                                          -> 404
```

**Deleted 2026-09-15**, once the key migration was verified:

```
DELETE /api/v1/component?componentKey=https%3A%2F%2F…%2Fmethodica-math-percent-02-00098%2F  -> 204
GET    (same key)                                                                          -> 404
GET    its item …-00098-001                                                                -> 404   (cascaded)
```

This is the first **write** exercised on the new query routes — until then only `GET` had been, per
the caveat in §5.1 — and it settles that `DELETE` works on an IRI-keyed component and still cascades
to its items. The seven real components were unaffected: 26 items, 42 questions,
`recommendedAfterFail` intact, all still `draft`. The unit now returns **0** `identifier_not_iri`
warnings, down from 34.

It served one last purpose before it went: while it existed it was the proof that
`identifier_not_iri` evaluates the key rather than tagging every row, being the only component in
the unit that returned no warning — and its slug-keyed *item* was the only row still warning after
the rename, which is how we knew the rename had skipped it correctly rather than missed it.
## 12. Reproducing this

```powershell
$env:KATA_API_KEY = '<catalogue key>'
pwsh -File docs-and-tools\probe-kata-api.ps1            # write semantics; safe, self-cleaning
pwsh -File docs-and-tools\probe-iri-item-key.ps1        # URL IRI vs URN at item level; safe
pwsh -File docs-and-tools\probe-iri-component-key.ps1   # ⚠ leaves a component behind — see below
```

`probe-kata-api.ps1` writes a full status table to `probe-kata-api.md`. The first two clean up after
themselves; the third is kept as the record of how §5.1 was established. **Its cleanup still fails**,
because it deletes through the path route — it is the script that produced §11. Since 2026-09-15 that
leftover is no longer permanent: whatever it strands can be removed with
`DELETE /api/v1/component?componentKey=…`. Rewriting its cleanup onto the query route would make it
self-cleaning like the other two, and is the obvious next edit if these probes are needed again.

> `probe-kata-api.ps1` originally contained the URL-IRI renames too, and that is what stranded §11:
> it renamed both an item and a component, then tried to DELETE them by their *stale* keys. It was
> corrected on 2026-09-11 — every rename is now tracked so cleanup addresses the key the entity
> actually has, renames are reversible forms only (slug→slug, URN), and the URL-IRI cases were moved
> out to the two dedicated probes, which run them inside a component that keeps its slug key so the
> parent DELETE always cascades. Re-verified live after the fix: `C1 204 · C2 204 · C3 204 · C4 404
> gone=True`, nothing left behind.

Related: `docs-and-tools/NOTE-TO-KATA-entity-id-iri.md` (the same questions, as sent — with the
2026-09-15 resolution recorded at its head), `../../Documentation/KATA/KATA-API.md` (the API
reference, updated for the same release),
`kata-vs-metadata.md`, `docs-and-tools/RETRIEVE-METADATA.md`.
