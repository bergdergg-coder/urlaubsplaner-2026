# Urlaubsplaner Würzburger Gruppe — Funktionsdokumentation

Mandantenfähiger, rollenbasierter Urlaubsplaner für die Würzburger Gruppe
(WGV · Würzburger AG · Würzburger GmbH). React + TypeScript + Vite + Tailwind v4,
vollständig im Browser (localStorage, Demo — keine echte Benutzerverwaltung/Backend).

---

## 1. Gesellschaften & Farben

| Gesellschaft   | Kürzel | Farbe       | Feiertage          | Standort |
|----------------|--------|-------------|--------------------|----------|
| WGV            | WGV    | **Orange** `#e8740c` | Baden-Württemberg | Stuttgart |
| Würzburger AG  | AG     | **Rot** `#d62828`    | Schweiz           | Zürich (CH) |
| Würzburger GmbH| GMBH   | **Hellgrün** `#6fae2f` | Baden-Württemberg | Stuttgart |

Definiert in [`src/index.css`](src/index.css) (CSS-Variablen) und
[`src/domain/seed.ts`](src/domain/seed.ts) (`COMPANIES`, inkl. Textfarbe `accentText`
für farbige Kopfzeilen). Wolfgang Würzburger ist ausschließlich der **WGV** zugeordnet.

Ansichten:
- **Pro Firma**: Filter „WGV / AG / GmbH" im Urlaubsplan (Admin) bzw. automatisch die
  eigene Gesellschaft (Firmenadministrator).
- **Gesamtübersicht Würzburger Gruppe**: Reiter „WW Controlling" (nur Admin).
- **Urlaubsübersicht pro Person**: Reiter „Pro Person" / „Meine Urlaube".

---

## 2. Rollen & Rechte ([`src/domain/permissions.ts`](src/domain/permissions.ts))

| Recht | Administrator | Firmenadministrator | Mitarbeiter |
|-------|:---:|:---:|:---:|
| Alle Firmen sehen | ✅ | – (nur eigene) | – (nur sich selbst) |
| Mitarbeiter anlegen/bearbeiten | ✅ | ✅ (eigene Firma) | – |
| Urlaube genehmigen/ablehnen | ✅ | ✅ | – |
| Outlook-/PDF-Export | ✅ | ✅ | – |
| Controlling / globale Einstellungen | ✅ | – | – |
| Zugänge anlegen | ✅ | ✅ (eigene Firma) | – |
| Eigenen Urlaub beantragen | ✅ | ✅ | ✅ |
| Eigene Übersicht + Antragsstatus | ✅ | ✅ | ✅ |

Mitarbeiter sehen **nur einen Reiter** („Meine Urlaube") und können **ausschließlich
die eigene Person** sehen/beantragen. Die Logik ist React-frei in `permissions.ts`
gekapselt und getestet.

**Demo-Zugänge** (Passwort überall `123`), definiert in [`src/store/auth.tsx`](src/store/auth.tsx):
- `Wolfgang Würzburger`, `Eric Dijkhof` → Administrator (alle Firmen)
- `Susanne Würzburger` (WGV), `Jochen Schwandt` (AG), `Frank Würzburger` (GmbH) → Firmenadministrator
- `Rebecca Würzburger` (WGV), `Nicolas Glishaber` (AG), `Nadine Rühle` (GmbH) → Mitarbeiter

---

## 3. Wie Admins Mitarbeiterzugänge erstellen

1. Als Administrator oder Firmenadministrator anmelden.
2. Reiter **Stammdaten** → Abschnitt **„Zugänge & Rollen"** → **„Zugang anlegen"**.
3. Mitarbeiter wählen, Rolle vergeben (Administrator nur durch Admin), Passwort setzen.
4. Speichern → der Zugang erscheint in der Anmeldeliste (im Browser gespeichert,
   löschbar). Feste Demo-Zugänge sind als „fest" markiert und nicht löschbar.

---

## 4. Wie Mitarbeiter Urlaub beantragen

1. Mitarbeiter meldet sich an → landet auf **„Meine Urlaube"**.
2. Button **„Urlaub beantragen"** → Dialog mit Zeitraum, ½-Tag, **Kommentar**.
3. Es werden live die **tatsächlichen Urlaubstage** und der **voraussichtliche Resturlaub**
   angezeigt. Mitarbeiter-Anträge gehen immer als **Antrag** (Status `requested`) ein.
4. Der Antrag erscheint beim zuständigen (Firmen-)Administrator unter **„Freigaben"**.
   Dort: **Genehmigen** (→ `approved`) oder **Ablehnen** (→ `rejected`), jeweils mit
   **Bearbeiter** und **Bearbeitungsdatum**. Abgelehnte Anträge bleiben als Verlauf
   erhalten (werden nicht gelöscht).
5. Der Mitarbeiter sieht den **Status** seiner Anträge (Beantragt / Genehmigt / Abgelehnt)
   in seiner Übersicht.

Ein Antrag enthält: Mitarbeiter · Zeitraum von/bis · berechnete Tage · Kommentar ·
Status · Bearbeiter · Bearbeitungsdatum (Modell in [`src/domain/types.ts`](src/domain/types.ts)).

---

## 5. Outlook-Export mit Filter ([`src/lib/exportFilter.ts`](src/lib/exportFilter.ts), [`OutlookExportDialog`](src/components/OutlookExportDialog.tsx))

Im Urlaubsplan → **„Outlook"**. Vier Filtermodi, jeweils auf den erlaubten Bereich
(Rechte) eingeschränkt, optional **„nur neue Urlaube seit dem letzten Export"**:

- **Alle** – alle Urlaube im erlaubten Bereich
- **Nach Firma** – WGV / AG / GmbH
- **Nach Rolle** – Geschäftsführung · Kader · Verwaltung · Mitarbeiter (Mehrfachauswahl)
  → z. B. *„nur Geschäftsführung & Kader"* für Wolfgangs Kader-Kalender
- **Personen** – individuell ausgewählte Personen (pro Firma alle/keine)

Export als **iCalendar/ICS** ([`src/lib/ics.ts`](src/lib/ics.ts)) — ganztägige Termine,
als „frei" markiert, von Outlook nativ über „Kalender → Aus Datei hinzufügen" importierbar.
Ein Merker (localStorage) verhindert Duplikate beim erneuten Import.

Die Funktionsgruppen (Geschäftsführung/Kader/Verwaltung/Mitarbeiter) werden in
[`src/domain/roles.ts`](src/domain/roles.ts) aus Abteilung + Kader-/GF-Kennzeichen abgeleitet.

---

## 6. Urlaubstage-, Feiertags- & Wochenendberechnung ([`src/lib/leave.ts`](src/lib/leave.ts))

`workdaysInRange(start, end, region, halfDayStart?, workdays?)`:
- Es zählen nur die **Arbeitstage der Person** — Vollzeit Mo–Fr oder ein individuelles
  **Teilzeit-Muster** (z. B. Mo/Di/Mi). Arbeitsfreie Tage zählen nie.
- **Gesetzliche Feiertage** der Region zählen nicht.
- **½-Tag** am ersten Tag zieht 0,5 ab.
- Region pro Mitarbeiter automatisch aus seiner Gesellschaft (WGV/GmbH → BW, AG → CH).

### Feiertage — algorithmisch für jedes Jahr ([`src/domain/holidays.ts`](src/domain/holidays.ts))
Nicht mehr fest 2026: bewegliche Feiertage werden über die **Osterformel** (Gauß/Meeus)
für jedes Jahr berechnet (Karfreitag, Ostermontag, Christi Himmelfahrt/Auffahrt,
Pfingstmontag, Fronleichnam), feste Feiertage je Region ergänzt. Funktioniert damit auch
für 2025, 2027 usw.

Beispiele (getestet):
- **Fr–Mo** zählt nur **Freitag + Montag** = 2 Tage.
- **Fr–Mo mit Pfingstmontag** = 1 Tag (Montag ist Feiertag).
- **Fronleichnam (04.06.2026)**: in BW frei (0), in der Schweiz Arbeitstag (1).
- **Teilzeit Mo/Di/Mi**: eine Woche Mo–Fr kostet nur **3** Urlaubstage.

### Resturlaubs-Konto `leaveAccount(employee, absences, today?)`
Liefert das vollständige Konto:
- **Jahresurlaub** — bei unterjährigem **Ein-/Austritt anteilig** (1/12 je vollem
  Beschäftigungsmonat, auf halbe Tage gerundet; `effectiveEntitlement`).
- **Resturlaub Vorjahr** (`carryover`) und davon **verfallen**: Übertrag, der bis zum
  **Stichtag 31.03.** nicht genommen wurde, verfällt (`carryoverLapsed`).
- **Verfügbar gesamt**, **genehmigt genommen**, **beantragt (offen)**, **verbleibend**
  sowie „verbleibend, wenn alle Anträge genehmigt würden".

Pflegbar je Mitarbeiter in den Stammdaten: Jahresanspruch, Resturlaub Vorjahr,
**Arbeitstage (Teilzeit)**, **Eintritt** und **Austritt**.

---

## 7. Ausdrucke / PDF

Jeder Ausdruck (Urlaubsplan, Pro-Person-Übersicht) trägt oben links das **Würzburger-Logo**,
daneben **„Würzburger Gruppe"**, den Titel sowie einen farbigen Balken/Badge in der
**Firmenfarbe** ([`PrintHeader`](src/components/ui/ui.tsx)). Auf dem Bildschirm ausgeblendet,
nur im Druck/PDF sichtbar. Druck über den jeweiligen „Drucken"-Button (A4 quer).

---

## 8. Tests ([`npm test`](package.json) — Vitest, 73 Tests)

> Urlaube werden in der **Firmenfarbe** dargestellt (WGV orange, AG rot, GmbH grün);
> „Pro Person" zeigt den **genommenen Urlaub im Jahresverlauf**. Nach einem 55-Agenten-Audit
> sind u. a. Import-Datumslogik, Beschäftigungsfenster-Begrenzung, Druck-Skalierung,
> Error-Boundary, Tastatur-/Kontrast-A11y und Modal-Fokus gehärtet.


- [`src/lib/leave.test.ts`](src/lib/leave.test.ts) — Wochenenden, Feiertage (BW/CH), Halbtage inkl. Sonderfälle, **Teilzeit**, **anteiliger Anspruch (Ein-/Austritt)**, **Resturlaub-Verfall**, Resturlaub-Konto
- [`src/domain/holidays.test.ts`](src/domain/holidays.test.ts) — algorithmische Feiertage (2025/2026/2027), BW vs. CH
- [`src/lib/exportFilter.test.ts`](src/lib/exportFilter.test.ts) — Export nach Alle/Firma/Rolle/Personen, Scope, abgelehnte ausgeschlossen
- [`src/lib/importer.test.ts`](src/lib/importer.test.ts) — Datumserkennung & Ablehnung unmöglicher Daten (z. B. 31.02.)
- [`src/domain/permissions.test.ts`](src/domain/permissions.test.ts) — Rollenrechte Admin vs. Mitarbeiter, Sicht-/Bearbeitungsrechte
- [`src/domain/roles.test.ts`](src/domain/roles.test.ts) — Funktionsgruppen-Einordnung

## 8a. Härtung (nach Mehrdimensions-Audit)

Die Rollentrennung wird nicht nur in der UI, sondern an der **Datengrenze** erzwungen:
- Schreibzugriffe in [`src/store/data.tsx`](src/store/data.tsx) prüfen den Scope des angemeldeten Zugangs
  (`canTouch` / `canManageCompany`): Mitarbeiter nur eigene Person + nur als Antrag; Manager nur eigene Gesellschaft;
  Genehmigen/Ablehnen nur mit Freigaberecht im Scope.
- `createAccount` ([`src/store/auth.tsx`](src/store/auth.tsx)) lässt Firmenadministratoren nur Mitarbeiter-Zugänge der
  eigenen Gesellschaft anlegen (keine Admin-/Fremdfirma-Eskalation); ein Zugang pro Person.
- `mergeWithSeed` ergänzt fehlende Stammdatenfelder aus dem Seed (korrekte Funktionsgruppen auch bei Altbeständen).
- Import lehnt unmögliche Datumswerte ab statt sie stillschweigend zu verschieben.
- Ausdrucke enthalten eine **Legende** (Urlaub / Antrag / Feiertag / Wochenende / Resturlaub), WYSIWYG-Druck (Monat **oder** Jahr).

---

## 9. Geänderte / neue Dateien

**Neu**
- `src/domain/roles.ts` — Funktionsgruppen (GF/Kader/Verwaltung/Mitarbeiter)
- `src/domain/permissions.ts` — Rollen & Rechte (rein, testbar)
- `src/lib/exportFilter.ts` — Export-Filterlogik
- `src/components/OutlookExportDialog.tsx` — gefilterter Outlook-Export
- `src/views/Uebersicht.tsx` — Urlaubsübersicht pro Person / Mitarbeiter-Self-Service
- `src/{lib,domain}/*.test.ts` — Tests, `DOKUMENTATION.md`

**Geändert**
- `src/index.css`, `src/domain/types.ts`, `src/domain/seed.ts` — Farben, Modell, Stammdaten
- `src/lib/leave.ts` — Berechnung & Resturlaubs-Konto
- `src/store/auth.tsx`, `src/store/data.tsx` — Rollen/Zugänge, Kommentar/Ablehnen/Bearbeiter
- `src/components/AddDialog.tsx`, `src/components/ui/ui.tsx` — Antrag mit Kommentar/Tagen, StatusBadge/PrintHeader
- `src/views/{Login,Freigaben,Planner,Stammdaten}.tsx`, `src/App.tsx` — Rollen-UI, Export, Druckkopf, Navigation
- `package.json` — Vitest + Test-Skripte
