# Verification — editorial iteration, 2026-10-05

## Scope and results

- 17 unit tests pass: ISBN equivalence/checksums, metadata merging and provenance, provider failures/cancellation, search, backups, copy identity, MARC21 normalization, byte-accurate UTF-8 ISO2709 parsing, injectable BN adapter and repository contract.
- Application matrix: 320, 360, 390, 430, 768 and 1440 px; light/dark; dashboard, catalog, acquisition, exemplar inventory, record, editor and settings. **84 route/theme/width checks** per browser run. No horizontal overflow; rendered inputs/selects/textareas have at least 16 px.
- Public matrix: both themes at the same six widths. Landing does not open IndexedDB. Mobile menu, navigation, shared theme and legacy hash redirects pass.
- Engines: Chromium (Chrome and Edge), WebKit with iPhone profile, and Firefox at mobile/tablet/desktop widths. These are emulations/desktop engines, not physical phones. Samsung Internet, Chrome on iOS and Firefox on Android have not been separately tested on hardware.
- Full regression: ISBN → metadata → confirm → physical copies → save → record/catalog → reload → data persists. Numeric validation and simulated IndexedDB quota failure retain the form and allow retry.
- Photos/copies: upload, view, enlargement, replace/cancel, delete/cancel, individual inventory/location edits, backup/restore and deleting the last copy while preserving the bibliographic record.
- Camera: actual ZXing EAN decoding from generated images and video stream in Chromium; actual image decoding in WebKit. Native-detector lifecycle tests verify stopping tracks on close, route change and hidden document. Windows WebKit cannot capture video, so live camera is explicitly skipped there.
- Existing IndexedDB v1 data migrates without losing book/work/edition/copy IDs or user location data. The DB name and version are unchanged by the public/app split.

## Limits and reproducibility

Provider responses in browser tests use deterministic fixtures. No tests touch the user's browser profile or real catalog. Screenshots and generated test data are under ignored `qa/`. Use the commands and environment options in README.

BN: connection to the documented TCP port succeeded. The optional Node/YAZ adapter and MARC mapper are fixture-tested; real Z39.50 authentication/record retrieval and a hosted HTTPS gateway remain unverified/unpublished. BNM and ISBN Argentina are external verification sources pending documented official integration. No paid infrastructure, scraping, CNAME or domain changes.
