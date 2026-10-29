# Note to the KATA team — component and item IDs vs 720 v2.5 p.11

> ## ✅ ANSWERED — KATA shipped the fix on 2026-09-15
>
> **This letter is kept verbatim below as the record of what was sent on 2026-09-14. Do not edit the
> body; append here instead.**
>
> KATA implemented the change its team proposed in reply: a complete **query-string route family for
> components**, `/api/v1/component?componentKey=…` — twelve operations covering read, update, delete,
> preview, publish, unpublish and every item operation beneath a component. The spec states the
> reason on every new parameter: *"Carried as a query parameter rather than a path segment because it
> may be an IRI/URL (slashes cannot route in a path)."* This is the same pattern already shipped for
> items, now extended to components, which is precisely what was asked for under "One request".
>
> **Our questions, as answered:**
>
> | # | Asked | Answer |
> |---|---|---|
> | 1 | Does slug `uniqueKey` + full-IRI `hostedContentRef` satisfy p.11? | **No.** Delivered as a new advisory `identifier_not_iri` warning on every slug-keyed row: *"uniqueKey should be an absolute IRI… Advisory for now."* The catalogue row is expected to carry the IRI |
> | 2 | Is a URN acceptable for components as an interim? | **Moot** — a URL IRI now works. We are not adopting the URN |
> | 2b | May we set the 26 item keys to their full URL IRIs now? | Effectively **yes**; unblocked and planned, see below |
> | 3 | Does KATA reconcile `object.id` to a catalogue row, and on which field? | **Still unanswered** |
> | 4 | Do `launcher/context` / state / statements work with a non-slug component key? | **Still unanswered — and now the only thing blocking us** |
> | 5 | Could a Methodica key read `GET /api/v1/xapi/statements`? | **Still unanswered.** Q3 remains unverifiable from our side without it |
>
> **The stranded probe component is recovered.** `…/methodica-math-percent-02-00098/` now returns
> `200` through `GET /api/v1/component?componentKey=…`. The request to delete it on our behalf is
> **withdrawn** — we can remove it ourselves. Thank you.
>
> **Our suggestion about adding a `pattern` to `uniqueKey` is withdrawn too, and KATA was right not
> to take it.** A `pattern` forbidding `/` would have turned the trap into a `422`, but it would also
> have permanently banned the very IRIs p.11 requires. Fixing the routing and reporting the
> identifier advisorily is the better answer.
>
> **What we would still ask, in one sentence:** Q4 and Q5 — *does the runtime accept an IRI
> `componentKey`, and may we have read access to `GET /api/v1/xapi/statements` so we can confirm it
> ourselves?* We will not rename keys on a live unit until launch behaviour with a non-slug
> `componentKey` is known; a launch failure takes learners offline with no undo.
>
> **One small thing to flag back:** the new routes declare only `200` and `422` in the spec but
> return `404` for an unknown key (`{"code":"resource.not_found"}`). Harmless, but a client written
> strictly against the spec would mishandle it.
>
> Current analysis and next steps: `../IDS-IRI-PROBLEM.md` (rev. 3). API reference updated for this
> release: `../../../Documentation/KATA/KATA-API.md`.

---

## The note as sent, 2026-09-14

**Unit:** `methodica-math-percent-02` (Methodica, live on the CDN since 2026-09-10, with xAPI
reporting and resume enabled)
**Date:** 2026-09-14 · **Contact:** Vadim Rozhansky, Methodic

*Written in English to match the rest of `docs-and-tools/`; happy to send a Hebrew version.*

---

## What we are trying to do

720 standard v2.5, p.11 (*"הגדרת מזהי רכיבים, פריטים (ID) במטא-דאטה על פי תקן xAPI"*) requires that
every component and item used as an `object` in reporting be identified by an IRI — *"לרוב מיוצג
ככתובת אינטרנט מלאה - URL, או כ-URN"* — and that the `id` field in the metadata be a full URL or
URN. v2.5 §2.7 relaxed this **for the content unit only**; components and items keep the obligation
from v2.2.

Our `metadata/*.json` complies: all 7 component ids and all 26 item ids are absolute IRIs, e.g.
`https://lomdot.education.gov.il/metodica/720active/math/percent/02/methodica-math-percent-02-01/`.
The xAPI statements our lomda sends carry exactly those strings as `object.id`.

**In KATA, however, the component ID field (`מזהה רכיב` / `uniqueKey`) shows a bare slug:**
`methodica-math-percent-02-01`. Item keys are slugs too, though — as we now understand — that is our
own doing rather than a platform limit. We would like to understand whether the slug satisfies the
standard, and if not, how to change it.

## What we found

KATA's component and item schema has **no `id` field at all** — only `uniqueKey` (a path key) and
`hostedContentRef`. Our sender was therefore reducing each IRI to its last path segment.

As an interim step we populated **`hostedContentRef` on all 26 items** with the item's full IRI, so
every component and item now carries its IRI somewhere in the catalogue. Components already had one
(`…/methodica-math-percent-02-01/index.html`).

We then probed, against a throwaway component, whether `uniqueKey` itself can hold an IRI. Scripts
and full output are in `docs-and-tools/probe-*.ps1` and `probe-kata-api.md`.

| `uniqueKey` value | route used | stored | `GET`/`PATCH`/`DELETE` | renameable back |
|---|---|---|---|---|
| slug (today) | either | yes | yes | yes |
| **full URL IRI — item** | path `/items/{item_key}` | yes | **404** | no |
| **full URL IRI — item** | **query `/item?itemKey=`** | yes | **works** (DELETE → 204) | **yes** |
| **full URL IRI — component** | path (the only one) | yes | **404** | **no** |
| **URN — component** | path | yes | 200 | yes |
| **URN — item** | either | yes | 200 | yes |

Three conclusions, and the first is a correction to our own earlier reading:

1. **You are right that item ids can be IRIs.** We had initially concluded otherwise, because we had
   only exercised `/api/v1/components/{unique_key}/items/{item_key}`, where the item key is a path
   segment. Once we used the singular `?itemKey=` route the IRI key behaves perfectly — read, patch,
   rename back, delete. Our mistake, and thank you for the correction.
2. **And you are right that component ids cannot be** — for exactly the reason you give. We
   confirmed against your spec that *every* component operation carries the key in the path
   (`GET`/`PATCH`/`DELETE /components/{unique_key}`, `/publish`, `/unpublish`, `/preview`, `/items`),
   with no query-string equivalent. Moving it to the query string, as you propose, is the same
   pattern you already ship for items and would resolve it cleanly.
3. **In the meantime a URN would also work for components** — no `/`, so it survives a path segment,
   and 720 v2.5 p.11 names a URN as a valid IRI alongside a URL. We are not asking for it, only
   noting it as an option that needs no API change. See Q2.

One caution about the URL-IRI-on-a-component case: it is not merely unsupported, it is a **trap**.
The value is accepted with a `200`, stored, and shown correctly in the tree — and the component is
then unreachable and undeletable. See "One request" below; we hit exactly this on a throwaway.

Incidentally: `uniqueKey` **is** mutable by PATCH at both levels — it is a property of
`ComponentUpdate` and `ItemUpdate` in your published spec. Our local copy of the API reference was
badly out of date and has since been regenerated from `https://kata.cet.ac.il/openapi.json`; that
is on us, not you.

One suggestion that falls out of this regardless of how you answer the questions above:
**`uniqueKey` has no `pattern` and no `format` in the schema**, so a full URL IRI validates cleanly,
is stored, and only then becomes unreachable at the routing layer. A `pattern` forbidding `/` would
turn a permanent, undeletable data trap into a `422` at the point of the mistake.

## Our questions

1. **Does the slug `uniqueKey` plus a full-IRI `hostedContentRef` satisfy v2.5 p.11?** If the
   catalogue row itself must carry the IRI, no unit in the catalogue currently complies.
2. **For components, is a URN acceptable as an interim**, given a URL cannot survive a path segment
   and the API change may take time? If so we would adopt
   `urn:lomdot:metodica:720active:math:percent:02:<slug>`. If you would rather we wait for the
   query-string change, we are happy to wait.
2b. **For items, may we set the 26 keys to their full URL IRIs now** — the same strings already in
   our metadata and in every statement — addressing them via `?itemKey=`? We would rather confirm
   than surprise you.
3. **Does KATA reconcile an incoming statement's `object.id` to a catalogue row, and on which
   field?** Note that on this unit `object.id` has *never* equalled `uniqueKey` — statements carry
   `https://…/methodica-math-percent-02-01/` while the row is keyed `methodica-math-percent-02-01` —
   and reporting has worked since go-live, which suggests the join is not on `object.id` at all. We
   would like that confirmed rather than assumed. If the join is on `componentKey` alone, then
   changing `uniqueKey` would break reporting, and `hostedContentRef` is documentation rather than a
   functional fix. We cannot check this ourselves — see Q5.
4. **Do `launcher/context` (`componentId`), `xapi/activities/state` and `xapi/statements`
   (`componentKey`) work with a non-slug component key?** This is the risk we are unwilling to take
   blind on a live unit: if launch fails with a URN or IRI key, learners lose access with no undo.
5. **Could a Methodica key be granted read access to `GET /api/v1/xapi/statements`?** Today the
   catalogue key returns `403 "not permitted to read xAPI events"` and the launch token returns
   `401`, so we cannot verify from our side that a reported `object.id` lands anywhere. Q3 is
   unanswerable without it.

## One request

While probing we stranded a **throwaway** component in this unit and cannot remove it via the API:

```
order=98   https://lomdot.education.gov.il/metodica/720active/math/percent/02/methodica-math-percent-02-00098/
title      "PROBE IRI-KEY — safe to delete"
isRequired false · isAssessment false · hostedContentRef null (nothing to launch) · 1 item · 0 questions
```

It is inert and the seven real components are untouched (26 items, 42 questions). Please delete it,
or tell us how. If your admin UI *can* delete it, that tells us the UI addresses components by an
internal id rather than the key — which would also mean the UI can set IRI keys safely where the
REST API cannot.

## What we are NOT doing

Nothing on the seven live components changes until we hear back. The only change applied so far is
the item `hostedContentRef` population described above, which is additive and touched no key, no
question and no component.
