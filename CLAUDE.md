# WhistleRocket — werkafspraken

- Alle tekst in de app is Nederlands, kort en gewoon (je-vorm). Merk: WhistleRocket, slogan "Impossible to ignore".
- Eén React + TypeScript-codebase voor het Windows-programma (Tauri 2, alleen NSIS-installer) en een latere webversie op whistlerocket.com. Verschillen tussen die twee horen in `src/lib/platform.ts`.
- Gegevens zijn lokaal-eerst in IndexedDB via Dexie (`src/db`). Schemawijziging = nieuwe `this.version(n)` met migratie, nooit versie 1 aanpassen.
- Kleuren komen uit de tokens in `src/styles/app.css` (donker en `[data-theme='licht']`); geen losse hexwaarden in componenten behalve projectkleuren en het merk-amber `#F5B451`.
- Projectkleuren moeten uniek zijn: `closestClash` in `src/lib/color.ts`.
- Voor je commit: `npm run typecheck`, `TZ=Europe/Amsterdam npm test`, `npm run build`. Rust-wijzigingen: `cargo check` in `src-tauri`.
- Versie staat in `package.json` (Tauri leest die) en in `src-tauri/Cargo.toml`. Release = tag `vX.Y.Z` pushen.
