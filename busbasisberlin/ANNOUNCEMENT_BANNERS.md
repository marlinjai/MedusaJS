# Announcement Banners

## Übersicht

Zwei dynamische Banner-Systeme für Ankündigungen auf der Startseite, die über das Medusa Admin verwaltet werden können - **ohne Rebuild der Storefront**.

## Banner-Typen

### 1. Horizontales Laufband (Marquee Banner)

- **Position:** Zwischen Hero-Section und Services
- **Animation:** Kontinuierliches horizontales Scrollen
- **Typen:** Info (blau), Warnung (gelb), Alert (rot)
- **Verwendung:** Allgemeine Ankündigungen, Öffnungszeiten, Lieferverzögerungen

### 2. Hero Alert Banner

- **Position:** Im Hero-Bereich zwischen Scroll-Button und Such-CTA
- **Style:** Semi-transparenter roter Hintergrund mit Backdrop-Blur
- **Verwendung:** Wichtige Warnungen, die sofort beim Seitenaufruf sichtbar sein sollen

## Admin-Konfiguration

### Zugriff

1. Medusa Admin öffnen
2. Sidebar: **"Ankündigungen"**
3. Oder: Navigiere zu `/settings/announcements`

### Einstellungen

#### Horizontales Laufband

- **Toggle:** Banner aktivieren/deaktivieren
- **Text:** Bannernachricht eingeben
- **Typ:** Info/Warnung/Alert auswählen
- **Vorschau:** Live-Preview mit Farben

#### Hero Alert

- **Toggle:** Alert aktivieren/deaktivieren
- **Text:** Alert-Nachricht eingeben
- **Vorschau:** Live-Preview mit semi-transparentem Design

### Speichern

- Button: **"Einstellungen speichern"**
- Änderungen sind **sofort** auf der Website sichtbar
- **Kein Rebuild/Deploy erforderlich**

## Technische Details

### Backend

**API Endpoint:** `/store/settings`

```typescript
GET /store/settings
{
  announcement_banner: {
    enabled: boolean,
    text: string,
    type: 'info' | 'warning' | 'alert'
  },
  hero_alert: {
    enabled: boolean,
    text: string
  }
}
```

**Implementierung:**

- `busbasisberlin/src/api/store/settings/route.ts`
- Liest Store-Metadata aus Medusa
- Public Endpoint (keine Authentifizierung)

### Frontend

**Komponenten:**

1. `busbasisberlin-storefront/src/modules/home/components/announcement-banner/index.tsx`

   - Marquee-Animation
   - Client-side fetch vom Backend
   - Automatisches Ausblenden wenn deaktiviert

2. `busbasisberlin-storefront/src/modules/home/components/hero-alert/index.tsx`
   - Statisches Alert-Banner
   - Semi-transparenter roter Hintergrund
   - Positionierung über z-index

**CSS Animation:**

```css
@keyframes marquee {
	0% {
		transform: translateX(0%);
	}
	100% {
		transform: translateX(-100%);
	}
}
```

**Integration:**

- Home Page: `<AnnouncementBanner />` zwischen Hero und Services
- Hero: `<HeroAlert />` im Hero-Component

### Admin UI

**Komponente:** `busbasisberlin/src/admin/routes/settings/announcements/page.tsx`

**Features:**

- Toggle-Switches für beide Banner
- Text-Eingabefelder
- Typ-Auswahl (Marquee)
- Live-Previews
- Speichern in Store-Metadata

## Verwendungsbeispiele

### Szenario 1: Betriebsferien

```
Horizontal Banner (Warnung):
"Werkstatt geschlossen vom 20.-27. Dezember 🎄"
```

### Szenario 2: Lieferverzögerung

```
Hero Alert:
"⚠️ Wichtig: Lieferungen verzögern sich aktuell um 2-3 Tage"
```

### Szenario 3: Neue Öffnungszeiten

```
Horizontal Banner (Info):
"Neue Öffnungszeiten ab sofort: Mo-Fr 8:00-18:00 Uhr"
```

### Szenario 4: Dringender Hinweis

```
Hero Alert:
"🚨 Werkstatt geschlossen - Notfälle unter: 0123-456789"
```

## Best Practices

### Texte

- **Kurz und prägnant:** Maximal 1-2 Sätze
- **Emojis nutzen:** Für bessere visuelle Wirkung
- **Call-to-Action:** Bei Bedarf Handlungsaufforderung einbauen

### Banner-Typen

- **Info (blau):** Neutrale Informationen, Öffnungszeiten
- **Warnung (gelb):** Verzögerungen, Einschränkungen
- **Alert (rot):** Dringende Hinweise, Schließungen

### Wann was verwenden?

- **Marquee:** Langfristige Infos (1-2 Wochen)
- **Hero Alert:** Kurzfristige, wichtige Warnungen (1-3 Tage)
- **Beide:** Bei kritischen Situationen für maximale Sichtbarkeit

## Deaktivieren

### Einzelner Banner

1. Admin → Ankündigungen
2. Toggle ausschalten
3. Speichern

### Komplett entfernen

- Text leer lassen + Toggle aus
- Banner wird automatisch ausgeblendet

## Troubleshooting

### Banner wird nicht angezeigt

1. **Admin:** Toggle aktiviert?
2. **Admin:** Text eingegeben?
3. **Browser:** Cache leeren (Ctrl+Shift+R)
4. **Backend:** API Endpoint erreichbar?

### Änderungen nicht sichtbar

- Browser-Cache leeren
- Inkognito-Modus testen
- API-Response prüfen: `GET /store/settings`

### Animation ruckelt

- Browser-Performance prüfen
- Reduzierten Motion aktiviert? (Betriebssystem)

## Datenspeicherung

**Speicherort:** Medusa Store Metadata

```json
{
	"announcement_banner_enabled": true,
	"announcement_banner_text": "Werkstatt geschlossen...",
	"announcement_banner_type": "warning",
	"hero_alert_enabled": true,
	"hero_alert_text": "⚠️ Wichtig: ..."
}
```

**Persistenz:** Datenbank (PostgreSQL)
**Backup:** Teil des regulären DB-Backups

## Entwicklung

### Lokales Testen

```bash
# Backend
cd busbasisberlin
npm run dev

# Frontend
cd busbasisberlin-storefront
npm run dev

# Admin öffnen
http://localhost:9000/app
```

### API manuell testen

```bash
curl http://localhost:9000/store/settings
```

### Metadata manuell setzen

```sql
UPDATE store
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{announcement_banner_enabled}',
  'true'
)
WHERE id = 'store_01...';
```

## Deployment

### Änderungen deployen

```bash
# Backend
git add busbasisberlin/src/api/store/settings/route.ts
git add busbasisberlin/src/admin/routes/settings/announcements/page.tsx
git commit -m "feat: add announcement banners"
git push

# Frontend
git add busbasisberlin-storefront/src/modules/home/components/announcement-banner/
git add busbasisberlin-storefront/src/modules/home/components/hero-alert/
git commit -m "feat: add announcement banner components"
git push
```

### Nach Deployment

- Admin UI ist sofort verfügbar
- Bannertext kann ohne weiteres Deployment geändert werden

## Support

Bei Fragen oder Problemen:

- Dokumentation prüfen
- Browser-Konsole checken
- API-Response testen







