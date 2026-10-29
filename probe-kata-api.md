# KATA API probe — methodica-math-percent-02

Run 2026-09-11 14:39:57 against `https://kata.cet.ac.il` with the catalogue key.
Throwaway component: `methodica-math-percent-02-00008`. All probe entities are deleted at the end (see C-rows).

| # | Question | Call | HTTP | Observed | Error |
|---|---|---|---|---|---|
| P0 | What key does KATA itself suggest for a component? | `GET /content/next-unique-key` | 200 | methodica-math-percent-02-00008 |  |
| P1 | Can we create a scratch component? | `POST /content-units/methodica-math-percent-02/components` | 201 | key=methodica-math-percent-02-00008 |  |
| P2 | Is hostedContentRef accepted on an item at create? | `POST /components/methodica-math-percent-02-00008/items` | 201 |  |  |
| P3 | Is it stored and returned verbatim? | `GET  /components/methodica-math-percent-02-00008/items/methodica-math-percent-02-00008-001` | 200 | hostedContentRef=https://lomdot.education.gov.il/metodica/720active/math/percent/02/probe/item-a/  questions=2 |  |
| P4 | Is hostedContentRef patchable? | `PATCH item {hostedContentRef}` | 200 |  |  |
| P4b | Did the PATCH actually take effect? | `GET  item` | 200 | applied=True  value=https://lomdot.education.gov.il/metodica/720active/math/percent/02/probe/item-a-CHANGED/ |  |
| P5 | Can it be cleared to null? (rollback path) | `PATCH item {hostedContentRef: null}` | 200 |  |  |
| P5b | Did it clear? | `GET  item` | 200 | value=https://lomdot.education.gov.il/metodica/720active/math/percent/02/probe/item-a-CHANGED/ |  |
| P5c | Does empty string clear it instead? | `PATCH item {hostedContentRef: ''}` | 422 |  | {"type":"about:blank","title":"Unprocessable Entity","status":422,"code":"validation.failed","detail":"hostedContentRef must be an absolute https URL"} |
| P5d | Can it be restored? | `PATCH item {hostedContentRef: <original>}` | 200 |  |  |
| P5e | Restored? | `GET  item` | 200 | value=https://lomdot.education.gov.il/metodica/720active/math/percent/02/probe/item-a/ |  |
| P6 | Is questions[] applied by a narrow PATCH? | `PATCH item {questions} 2 -> 3` | 200 |  |  |
| P6b | Did the questions actually change? | `GET  item` | 200 | count=3 (expect 3)  types=numeric,choice,fill-in |  |
| P6c | Does a FULL item PATCH apply questions? (sender shape) | `PATCH item {full body}` | 200 |  |  |
| P6d | Did it? | `GET  item` | 200 | count=3 (expect 3) |  |
| P7 | Does questions: [] delete them, or no-op? | `PATCH item {questions: []}` | 200 |  |  |
| P7b | Result | `GET  item` | 200 | count=0 |  |
| P8 | Is uniqueKey accepted in an item PATCH (slug -> slug)? | `PATCH item {uniqueKey: <slug>}` | 200 |  |  |
| P8b | Did the item move to the new key? | `GET  item/methodica-math-percent-02-00008-002` | 200 | renamed=True |  |
| P10 | Is a component uniqueKey mutable by PATCH? | `PATCH component {uniqueKey}` | 200 |  |  |
| P10b | Did the component move to the new key? | `GET  component` | 200 | renamed=True |  |
| P10c | Renamed back? | `PATCH component {uniqueKey: <original>}` | 200 | now=methodica-math-percent-02-00008 |  |
| P11 | Is a URN accepted as a component key? (v2.5 p.11 allows URN) | `POST component {uniqueKey: urn:…}` | 201 |  |  |
| C1 | Delete probe item | `DELETE item/methodica-math-percent-02-00008-002` | 204 |  |  |
| C2 | Delete probe component | `DELETE component` | 204 |  |  |
| C3 | Delete URN probe component (escaped) | `DELETE component (urn, %-escaped)` | 204 |  |  |
| C4 | Is the probe component gone? | `GET  component` | 404 | gone=True | {"type":"about:blank","title":"Not Found","status":404,"code":"resource.not_found","detail":"content not found"} |

## How to read this

- **P6/P6b** is the one that matters: if the PATCH returns 2xx but the GET still shows 2 questions, KATA accepts question writes and silently discards them — and every `updated=` line in `send-metadata.log` is meaningless for question content.
- **P4b/P5b** gate the item `hostedContentRef` work: it is only safe to populate if it is both patchable and clearable.
- **P8/P10** show that `uniqueKey` IS mutable by PATCH at both levels, contradicting `KATA-API.md:191,196` and `KATA-API-DETAILED.md:236-246`, which both document it as create-only.
- **P11** matters most: a URN has no `/`, so unlike a full URL it survives a path segment. It is a legal IRI under 720 v2.5 p.11 ("URL, או כ-URN"), which makes it the only form that satisfies the standard while keeping the entity addressable.
- The full-URL-IRI cases are deliberately NOT here — they strand the entity permanently. See `probe-iri-component-key.ps1` and `probe-iri-item-key.ps1`.