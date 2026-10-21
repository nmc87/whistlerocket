# WhistleRocket

**Impossible to ignore.** Al je bedrijven en projecten op één startscherm, met taken en uren. Dit is de versie voor eigen gebruik: een Windows-programma, en dezelfde app later ook als website op whistlerocket.com.

## Installeren op Windows

1. Ga in deze repository naar **Releases** (rechts op de hoofdpagina) en open de nieuwste versie.
2. Download `WhistleRocket_<versie>_x64-setup.exe` en voer het uit. Installeren vraagt geen beheerdersrechten.
3. Windows waarschuwt de eerste keer, omdat de app nog niet ondertekend is: klik op **Meer informatie** en dan **Toch uitvoeren**.

Een nieuwe versie installeer je op dezelfde manier over de oude heen; je gegevens blijven staan.

Tussentijdse versies (elke wijziging op `main`) staan bij **Actions** → de laatste run van *Windows-installer* → **Artifacts**.

## Wat zit erin (blok 1)

- **Vandaag:** begroeting, snelkiezer met je bedrijfslogo's, taken voor vandaag, uren deze week, focus-timer en al je projecten met filter op Bedrijf, Startup en Project (en per holding).
- **Projecten:** eigen kleur (geen twee projecten met een kleur die op elkaar lijkt), logo of monogram, label, holding, weekdoel.
- **Uren:** stopwatch en afteller (met fluittoon en melding als de tijd om is), uren achteraf toevoegen, overzicht per project per dag, export als CSV voor je boekhouding.
- **Taken:** per project of los, met datum; gegroepeerd in te laat, vandaag, komende 7 dagen, later.
- **Instellingen:** projecten beheren, donker, daglicht of Windows volgen, back-up maken en terugzetten.
- **Zoeken:** `Ctrl+K` zoekt in projecten en taken.

## Waar staan je gegevens?

Alleen op je eigen computer, in de opslag van het programma (IndexedDB). Er gaat nog niets naar internet. Maak via **Instellingen → Back-up maken** af en toe een back-up, bijvoorbeeld naar je OneDrive-map.

## Volgende blokken

| Blok | Wat |
|---|---|
| 2 | Moneybird alleen-lezen: facturen in de takenlijst en de agenda, geld deze week |
| 3 | Agenda en mail van je eigen accounts; Claude per project |
| 4 | Eigen cloud (EU) met inloggen, synchronisatie en de ochtend-recap om 07:00; webversie op whistlerocket.com |

## Ontwikkelen

Nodig: Node.js 22. Voor het Windows-programma ook Rust en de Microsoft C++ Build Tools ([Tauri-vereisten](https://v2.tauri.app/start/prerequisites/)).

```bash
npm install
npm run dev          # webversie op http://localhost:1420
npm run tauri dev    # Windows-programma met live herladen
npm test             # tests (zet TZ=Europe/Amsterdam voor de zomertijd-test)
npm run tauri build  # installer in src-tauri/target/release/bundle/nsis
```

Elke push naar `main` bouwt de installer en zet hem bij Releases onder de versie uit `package.json`. Een nieuwe release: verhoog `version` in `package.json` en `src-tauri/Cargo.toml` en push.

### Opbouw

```
src/
  db/           opslag (Dexie), acties, startdata, back-up
  lib/          tijd, kleuren, hooks, Windows/web-verschillen
  components/   zijbalk, bovenbalk, timer, taken, projectformulier
  pages/        Vandaag, Project, Uren, Taken, Instellingen
src-tauri/      het Windows-programma (Tauri 2)
```
