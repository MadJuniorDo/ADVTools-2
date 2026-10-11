# 🛠️ ADVTools Backend (.NET 10 Web API)

RESTful API-Service für ADVTools zur Verwaltung von Kunden und zur Kommunikation mit der **Blizzard Battle.net API** sowie der **Raider.IO API**.

## 🚀 Technologien

- **Framework:** ASP.NET Core (.NET 10.0 Minimal APIs)
- **ORM / Datenbank:** Entity Framework Core mit `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Authentifizierung:** OAuth 2.0 Client Credentials Flow (Blizzard Battle.net)
- **API-Dokumentation:** ASP.NET Core OpenAPI (`/openapi/v1.json`)

## ⚙️ Konfiguration

Das Backend lädt Umgebungsvariablen automatisch aus der `.env`-Datei im Root-Verzeichnis oder nutzt die System-Umgebungsvariablen / `appsettings.json`.

Benötigte Schlüssel:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL-Verbindungsdaten
- `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET`: Blizzard API App Credentials

## 💻 Lokaler Start

```bash
# Abhängigkeiten wiederherstellen
dotnet restore

# Backend im Entwicklungsmodus starten
dotnet run
```

## 🐳 Docker Build

```bash
docker build -t advtools-backend -f Dockerfile .
```
