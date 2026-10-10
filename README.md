# saltyfutureCraft – online bereitstellen

Dieses Projekt enthält die vorhandene Minecraft-Bauplan-Webseite plus einen kleinen Node.js-Server, der Bild-/Textanfragen serverseitig an die Anthropic API weiterleitet. Der API-Schlüssel wird **nicht** im HTML gespeichert.

## Vor der Veröffentlichung

- Du brauchst ein Anthropic-Console-Konto mit API-Zugriff und aktivierter Abrechnung. Eine Claude-ChatGPT/Claude-Web-Mitgliedschaft ist nicht automatisch ein API-Schlüssel.
- API-Anfragen können Kosten verursachen. Setze Ausgaben-/Nutzungslimits in deinem Anbieter-Konto.
- Render und Anthropic sind Drittanbieter. Lies ihre aktuellen Bedingungen und Preise, bevor du live gehst.

## Online stellen mit Render (ohne eigenen Server)

1. Lade den kompletten Ordner `saltyfutureCraft-site` in ein neues GitHub-Repository hoch. Lade `.env` oder einen echten Schlüssel niemals hoch.
2. Erstelle/öffne ein Konto bei Render und wähle **New + → Blueprint**.
3. Verbinde das GitHub-Repository, das diese `render.yaml` enthält, und starte das Deployment.
4. Öffne beim Render-Webservice **Environment** und setze `ANTHROPIC_API_KEY` auf deinen geheimen Anthropic-API-Schlüssel. Lass den Schlüssel ausschließlich dort serverseitig stehen.
5. Falls erforderlich, setze `ANTHROPIC_MODEL` auf ein Modell, das in deinem API-Konto verfügbar ist.
6. Speichere die Umgebungsvariablen und starte den Service erneut.
7. Warte auf einen erfolgreichen Deploy. Öffne `https://DEIN-SERVICE.onrender.com/api/health`. `ok: true` zeigt, dass der Webserver läuft; `configured: true` bedeutet, dass ein API-Schlüssel gesetzt ist.
8. Öffne die Render-URL ohne `/api/health`. Das ist dein teilbarer Website-Link.

## Lokal testen

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
```

Kopiere `.env.example` nach `.env`, ersetze den Platzhalter durch deinen API-Schlüssel und führe dann aus:

```bash
npm start
```

Öffne `http://localhost:3000`.

## Hinweise

- Das Demo-Haus und die 3D-/Ebenenansicht funktionieren ohne API-Schlüssel; die KI-Analyse benötigt ihn.
- Die Nutzer laden ihre Hausbilder an deinen Server und von dort an Anthropic hoch. Informiere Besucher entsprechend, wenn du die Seite öffentlich betreibst.
- Der Server begrenzt Anfragen pro IP grob auf acht pro Minute. Für eine stark genutzte öffentliche Seite solltest du Authentifizierung, strengere Limits und Kostenüberwachung ergänzen.
- Die Minecraft-Texturen werden weiterhin vom Nutzer lokal aus seiner eigenen `.jar` geladen. Die Lizenzbedingungen von Minecraft/Microsoft beachten.
