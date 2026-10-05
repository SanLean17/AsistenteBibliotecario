# Verification — 2026-10-05

- Unit tests: 12/12 pass (ISBN, catalog validation/search, metadata merging and cancellation, scanner lifecycle, photo archives).
- Edge and Chrome with Android mobile profiles: manual and ISBN save, reload persistence, editing, continuous search, duplicate detection, numeric validation, failed IndexedDB write and retry, backups, cancel/delete/clear confirmations.
- WebKit with iPhone profile: same catalog flows, migration and photo upload/view/restore. This is engine/device emulation, not a physical Safari/iPhone test.
- Responsive matrix: 320, 390, 768 and 1440 px; light/dark; home, catalog, acquisition, record, editor, settings. 48 layout checks per full browser run, with screenshots. No horizontal page overflow; displayed inputs/selects/textareas are at least 16 px.
- Actual ZXing decoding of a generated EAN-13: image files in Chromium and WebKit; generated video stream in Chromium. Windows WebKit does not expose media capture, so its live-camera test is explicitly skipped. Real-device camera permissions, focus and lighting remain hardware-dependent.
- Cover and physical-copy photo remain separate; selecting the first copy after reload does not display another copy's photograph.
- IndexedDB v1 migration preserves record, work, edition and physical-copy identifiers and user location data.
- Original save failure reproduced before the fix: browser navigated to a URL containing the form values because `name="id"` shadowed `form.id`. After the fix, submission remains in the application, awaits IndexedDB completion and opens the saved record without query parameters.

Bibliographic provider responses are deterministic fixtures during automated tests. No tests use the user's existing browser profile or live catalog. `qa/` is ignored by Git. No CNAME or domain settings are changed.
