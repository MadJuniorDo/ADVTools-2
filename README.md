# ⚔️ ADVTools 2.0 – World of Warcraft Customer & Character Management

[![.NET Version](https://img.shields.io/badge/.NET-10.0-purple.svg?style=flat&logo=dotnet)](https://dotnet.microsoft.com/)
[![React Version](https://img.shields.io/badge/React-19.2-61dafb.svg?style=flat&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg?style=flat&logo=docker)](https://www.docker.com/)
[![Blizzard API](https://img.shields.io/badge/API-Battle.net-009ae4.svg?logo=battlenet)](https://develop.battle.net/)
[![Raider.IO API](https://img.shields.io/badge/API-Raider.IO-ff8000.svg)](https://raider.io/api)

**ADVTools** ist eine moderne Full-Stack-Webanwendung zur effizienten Verwaltung von Kunden und deren World of Warcraft-Charakteren (z. B. für Boosting-Services, Community-Betreuung oder Gildenorganisation).

Die Anwendung synchronisiert Charaktereigenschaften wie **Item Level (GearScore)**, **Klasse**, **Fraktion** sowie **Mythic+ Scores** in Echtzeit über die offizielle **Blizzard Battle.net API** und die **Raider.IO API**. Darüber hinaus bietet ein interaktiver **Armory Inspector** eine detaillierte Ausrüstungsansicht inklusive Sockel, Edelsteine, Item-Qualität und 3D/2D-Charakter-Rendern.

---

## 📑 Inhaltsverzeichnis

- [Features](#-features)
- [Architektur & Tech-Stack](#-architektur--tech-stack)
- [Projektstruktur](#-projektstruktur)
- [Voraussetzungen](#-voraussetzungen)
- [Konfiguration (.env)](#-konfiguration-env)
- [Schnellstart mit Docker](#-schnellstart-mit-docker)
- [Lokale Entwicklung (ohne Docker)](#-lokale-entwicklung-ohne-docker)
  - [1. PostgreSQL einrichten](#1-postgresql-einrichten)
  - [2. Backend starten](#2-backend-starten)
  - [3. Frontend starten](#3-frontend-starten)
- [API-Endpunkte](#-api-endpunkte)
- [Datenbankschema](#-datenbankschema)
- [Lizenz & Danksagung](#-lizenz--danksagung)

---

## ✨ Features

### 👥 Kundenverwaltung (Customer Management)
- **Live-Suche & Filter:** Blitzschnelle Filterung nach Kundenname, Discord-ID, BattleTag, Herkunft oder Notizen.
- **Multi-Tab-System:** Mehrere Kunden parallel öffnen, flexibel zwischen Tabs wechseln und mit Mittelklick oder Schließen-Button schließen.
- **Favoriten & Sortierung:** Kunden als Favoriten markieren, nach Name oder Charakteranzahl sortieren sowie Reihenfolge per Drag & Drop anpassen.
- **Detaillierte Metadaten:**
  - Discord-ID & BattleTag
  - Herkunft / Quelle (z. B. Discord-Server, Forum, Bekannter, Ingame)
  - Individuelle Rabatt-Vergabe (Schnellauswahl: 0%, 5%, 10%, 15%, 20%, 25% oder Freitext)
  - Mehrzeilige Freitext-Notizen für Absprachen, Termine oder Zahlungsmodalitäten
- **Header-Badges:** Konfigurierbare Schnellanzeige von Discord, BattleTag, Herkunft und Rabatt im Header.

### 🛡️ Charakterverwaltung & Live-Synchronisation
- **Automatische Profil-Synchronisation:**
  - **Blizzard Profile API:** Automatische Abfrage von Level, Item Level (GearScore), Klasse und Fraktion (Horde / Allianz).
  - **Raider.IO API:** Abfrage der aktuellen Mythic+ Scores aufgeteilt nach Gesamtwertung (All), DPS, Heiler und Tank.
- **Interaktiver Armory Inspector:**
  - Komplette Ausrüstungsübersicht (Kopf, Schultern, Brust, Waffen, Schmuckstücke usw.) mit Item-Level.
  - Originale World of Warcraft Qualitätsfarben (Legendär, Episch, Selten etc.).
  - Sockel- und Edelstein-Anzeige (inklusive Edelstein-Icons direkt von der Blizzard Media API).
  - Offizielles 2D/3D-Charakter-Artwork/Render.
  - In-Memory Caching für Blizzard Medien-Icons zur Performance-Optimierung.
- **Updates & Batch-Verarbeitung:**
  - Manueller Aktualisierungs-Button je Kunde (parallele Abfrage aller Charaktere).
  - Globales Batch-Update aller Charaktere im Hintergrund mit Live-Fortschrittsbalken.

### 📋 Export & Produktivität
- **1-Klick-Export:** Kopiert Kunden- und Charakterdaten fertig formatiert für Discord, Notizen oder Tabellenkalkulationen in die Zwischenablage.
- **Einzelcharakter-Export:** Kopiert Charakterdetails und Raider.IO-Link mit einem Klick.
- **Quick-Links Bar:** Anpassbare Schnellzugriffsleiste für externe Seiten (z. B. Raider.IO, Warcraft Logs, Wowhead).

---

## 🏗️ Architektur & Tech-Stack

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Tabs, Dark UI, Armory Modal, Drag & Drop, Badges)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / REST
                            ▼
┌────────────────────────────────────────────────────────┐
│               Nginx Reverse Proxy (:80)                │
└───────────────────────────┬────────────────────────────┘
                            │ /api/ Proxy
                            ▼
┌────────────────────────────────────────────────────────┐
│            ASP.NET Core 10 Web API Backend             │
│   (Minimal APIs, Entity Framework Core, Icon Cache)    │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
        EF Core / SQL                     │ OAuth2 & REST
               │                          ▼
               ▼            ┌───────────────────────────┐
┌─────────────────────────┐ │ • Blizzard Battle.net API │
│  PostgreSQL 17 Database │ │ • Raider.IO API           │
└─────────────────────────┘ └───────────────────────────┘
```

- **Frontend:** [React 19](https://react.dev/), [Axios](https://axios-http.com/), CSS3 (Responsive Dark Mode Design), Nginx
- **Backend:** [ASP.NET Core (.NET 10)](https://dotnet.microsoft.com/), [Entity Framework Core](https://learn.microsoft.com/ef/core/), [Npgsql](https://www.npgsql.org/)
- **Datenbank:** [PostgreSQL 17](https://www.postgresql.org/)
- **Containerisierung:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## 📁 Projektstruktur

```plaintext
advtools/
├── backend/
│   ├── advserviceses.csproj    # .NET 10 Web API Projektdatei
│   ├── advserviceses.sln       # Visual Studio / Rider Solution
│   ├── Dockerfile              # Multi-Stage Dockerfile für .NET 10
│   ├── Models.cs               # EF Core DbContext, Entitäten & DTOs
│   ├── Program.cs              # API-Endpunkte, Blizzard/RIO Client & Logik
│   ├── appsettings.json        # Basis-Konfiguration
│   └── appsettings.Development.json
├── frontend/
│   ├── Dockerfile              # Nginx Container für React Build
│   ├── nginx.conf              # Nginx Konfiguration mit /api/ Proxy
│   ├── package.json            # NPM Dependencies & Skripte
│   ├── public/                 # Statische Assets (Klassen- & Fraktions-Icons)
│   └── src/
│       ├── App.js              # Hauptkomponente mit UI-Logik
│       ├── App.css             # Styling & Dark Mode Layout
│       └── index.js            # React Einstiegspunkt
├── docker-compose.yml          # Multi-Container-Setup (Backend, Frontend, DB)
├── .env.example                # Vorlage für Umgebungsvariablen
└── README.md                   # Projektdokumentation
```

---

## 📋 Voraussetzungen

- **Für den Docker-Betrieb (Empfohlen):**
  - [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- **Für die lokale Entwicklung (ohne Docker):**
  - [.NET 10 SDK](https://dotnet.microsoft.com/download)
  - [Node.js](https://nodejs.org/) (Version 18 oder neuer) & npm
  - [PostgreSQL](https://www.postgresql.org/) (Version 14+)
- **API-Zugangsdaten:**
  - Ein Entwickler-Account im [Blizzard Battle.net Developer Portal](https://develop.battle.net/) (kostenlos) mit einer registrierten Client-App (`Client ID` und `Client Secret`).

---

## ⚙️ Konfiguration (.env)

Erstelle im Projekt-Stammverzeichnis eine Datei namens `.env` (auf Basis der beiliegenden `.env.example`):

```bash
cp .env.example .env
```

Passe die Werte entsprechend deiner Umgebung an:

```env
# Datenbank-Konfiguration
DB_HOST=postgres-db
DB_PORT=5432
DB_NAME=wow_customer
DB_USER=admin
DB_PASSWORD=dein_sicheres_passwort

# Blizzard Battle.net API (EU Region)
BLIZZARD_CLIENT_ID=deine_blizzard_client_id
BLIZZARD_CLIENT_SECRET=deine_blizzard_client_secret

# Port-Mappings für Docker
BACKEND_PORT=5253
FRONTEND_PORT=8009
```

> [!NOTE]
> Das Backend liest die `.env`-Datei beim Start automatisch ein und überschreibt die Verbindungseinstellungen dynamisch.

---

## 🚀 Schnellstart mit Docker

Das Projekt lässt sich vollständig mit Docker Compose starten:

1. **Repository klonen:**
   ```bash
   git clone https://github.com/MadJuniorDo/ADVTools-2.git
   cd ADVTools-2
   ```

2. **Frontend-Build erstellen (falls noch nicht vorhanden):**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **Container via Docker Compose starten:**
   ```bash
   docker compose up -d --build
   ```

4. **Anwendung aufrufen:**
   - **Frontend:** [http://localhost:8009](http://localhost:8009) (bzw. konfigurierter `FRONTEND_PORT`)
   - **Backend API:** [http://localhost:5253/api/customers](http://localhost:5253/api/customers) (bzw. konfigurierter `BACKEND_PORT`)

5. **Container stoppen:**
   ```bash
   docker compose down
   ```

---

## 💻 Lokale Entwicklung (ohne Docker)

### 1. PostgreSQL einrichten

Erstelle eine PostgreSQL-Datenbank und die benötigten Tabellen (siehe [Datenbankschema](#-datenbankschema)):

```sql
CREATE DATABASE wow_customer;
```

Stelle sicher, dass die Zugangsdaten in deiner `.env`-Datei (`DB_HOST=localhost`, etc.) hinterlegt sind.

### 2. Backend starten

```bash
cd backend
dotnet restore
dotnet run
```

Das Backend startet standardmäßig auf `http://localhost:5253` (oder dem in `appsettings.json` konfigurierten Port) und stellt Swagger/OpenAPI im Development-Modus bereit.

### 3. Frontend starten

```bash
cd frontend
npm install
npm start
```

Das React-Entwicklungsserver startet auf [http://localhost:3000](http://localhost:3000) und leitet API-Aufrufe über den in `package.json` hinterlegten Proxy an `http://localhost:5253` weiter.

---

## 🔌 API-Endpunkte

Das Backend stellt folgende REST-Endpunkte unter `/api` bereit:

| Methode | Endpunkt | Beschreibung |
| :--- | :--- | :--- |
| `GET` | `/api/customers` | Gibt alle Kunden zurück (optionaler Parameter `?query=` für Suche). |
| `POST` | `/api/customers` | Erstellt einen neuen Kunden. |
| `PUT` | `/api/customers/{id}` | Aktualisiert Kundendaten (Name, Discord, BattleTag, Herkunft, Rabatt, Notizen). |
| `GET` | `/api/customers/{id}/characters` | Ruft alle Charaktere eines Kunden ab. |
| `POST` | `/api/customers/{id}/characters` | Fügt einen Charakter hinzu & ruft initiale Blizzard-/RIO-Daten ab. |
| `POST` | `/api/customers/{id}/characters/update` | Aktualisiert alle Charaktere eines spezifischen Kunden. |
| `DELETE` | `/api/customers/{id}/characters/{charId}` | Entfernt einen Charakter eines Kunden. |
| `GET` | `/api/characters/{realm}/{name}/equipment` | Ruft Ausrüstung, Sockel, Edelsteine & Charakter-Render via Blizzard API ab. |
| `POST` | `/api/update-data` | Startet das globale Batch-Update aller Charaktere in der Datenbank. |
| `GET` | `/api/update-progress` | Gibt den Fortschritt (`total`, `current`, `isRunning`) des Batch-Updates zurück. |

---

## 🗄️ Datenbankschema

Die Tabellen werden von Entity Framework Core verwaltet. Bei manueller Einrichtung kann folgendes SQL-Skript verwendet werden:

```sql
-- Tabelle: customers
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL,
    name TEXT NOT NULL,
    battletag TEXT,
    origin TEXT,
    discount_percent NUMERIC(5, 2),
    notes TEXT
);

-- Tabelle: characters
CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    char_name TEXT NOT NULL,
    realm TEXT NOT NULL,
    faction TEXT,
    class TEXT,
    rio_all_score NUMERIC(6, 1),
    rio_dps_score NUMERIC(6, 1),
    rio_heal_score NUMERIC(6, 1),
    rio_tank_score NUMERIC(6, 1),
    gear_score INT,
    level INT,
    CONSTRAINT uq_character_realm UNIQUE (char_name, realm)
);

-- Indizes zur Optimierung
CREATE INDEX IF NOT EXISTS idx_characters_customer_id ON characters(customer_id);
```

---

## 🤝 Mitwirken & Weiterentwicklung

Beiträge, Issue-Meldungen und Feature-Requests sind herzlich willkommen!

1. Forke das Projekt
2. Erstelle einen Feature-Branch (`git checkout -b feature/NeuesFeature`)
3. Committe deine Änderungen (`git commit -m 'Add: Neues Feature hinzugefügt'`)
4. Pushe auf den Branch (`git push origin feature/NeuesFeature`)
5. Öffne einen Pull Request

---

## 📜 Lizenz & Danksagung

- World of Warcraft und Battle.net sind Marken oder eingetragene Marken von **Blizzard Entertainment, Inc.** in den USA und/oder anderen Ländern.
- Raider.IO-Daten bereitgestellt über die offizielle [Raider.IO API](https://raider.io/api).
