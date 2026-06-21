# ImmoAssist – Go-to-Market & Geschäftsmodell

Dieser Leitfaden fasst zusammen, wie aus der App ein verkaufbares Produkt wird:
Zielgruppe, Nutzenversprechen, Preise, Verkaufsweg und die nächsten Schritte.

## 1. Positionierung in einem Satz

> **ImmoAssist ist der KI-Assistent, der Immobilienmaklern den Posteingang
> abnimmt – schnellere Antworten, priorisierte Leads, mehr Besichtigungen.**

## 2. Zielkunde

- **Primär:** Einzelmakler und kleine Maklerbüros (1–8 Personen) in Deutschland.
- **Schmerzpunkt:** Anfragen kommen schneller, als sie beantwortet werden können;
  der erste, der gut reagiert, bekommt den Termin.
- **Zahlungsbereitschaft:** hoch – eine Provision liegt im vier- bis fünfstelligen
  Bereich, also rechtfertigt schon ein zusätzlicher Abschluss viele Monate Abo.

## 3. Nutzenversprechen (warum sie kaufen)

| Nutzen | Wirkung |
|---|---|
| KI-Antwortentwürfe | spart Stunden pro Woche, antwortet in Minuten statt Stunden |
| Lead-Scoring | Fokus auf die heißen Kontakte, weniger verlorene Chancen |
| Termine & Kalender | weniger Hin-und-Her, mehr Besichtigungen |
| Exposé-Generator | fertige Texte auf Knopfdruck |
| Analysen & Briefing | Überblick und Kontrolle über die Pipeline |

Kernbotschaft: **„Wie ein Mitarbeiter, der nie eine Anfrage liegen lässt – aber
Sie senden die Nachricht."**

## 4. Preismodell (SaaS, monatlich)

| Plan | Preis | Für wen |
|---|---|---|
| Solo | 49 €/Monat | Einzelmakler, Grundfunktionen |
| **Pro** | **99 €/Monat** | aktive Makler, voller Funktionsumfang (Hauptangebot) |
| Team | 249 €/Monat | Büros mit mehreren Mitarbeitenden |

- 14 Tage kostenlos testen, keine Einrichtungsgebühr, monatlich kündbar.
- Zwei Wege zur Umsatzgenerierung: **(a)** als SaaS direkt verkaufen oder
  **(b)** als individuell angepasste Lösung pro Maklerbüro für einen einmaligen
  Projektpreis (z. B. 10.000 €) plus Wartung.

## 5. Verkaufsweg (wie sie kaufen)

1. **Landingpage** (`landing.html`) erklärt Nutzen und führt zur Live-Demo.
2. **Live-Demo** (`index.html`) – sofort ausprobierbar, ohne Anmeldung. Das ist
   das stärkste Verkaufsargument: Makler sehen den Tippeffekt und sind überzeugt.
3. **Direktansprache:** 10–20 lokale Maklerbüros kontaktieren, kurze
   Online-Demo anbieten, ersten zahlenden Kunden gewinnen.
4. **Referenz nutzen:** mit dem ersten zufriedenen Kunden als Referenz die
   nächsten gewinnen (Empfehlungen sind in der Branche entscheidend).

## 6. Was technisch noch fehlt (Reihenfolge)

1. **Echte KI anschließen** – `server/` mit Claude API in Betrieb nehmen
   (siehe `server/README.md` und `DEPLOYMENT.md`). Macht aus Vorlagen echte,
   frei formulierte Antworten.
2. **Login & Mandanten** – pro Makler eigener Account und eigene Daten
   (statt gemeinsamer Demo-Daten im Browser).
3. **E-Mail-/Portal-Anbindung** – Anfragen aus ImmoScout, E-Mail o. Ä.
   automatisch einlesen und Antworten direkt versenden.
4. **Zahlung** – Stripe-Abo für die monatliche Abrechnung.
5. **DSGVO** – Auftragsverarbeitungsvertrag, Datenschutzerklärung, Hosting in der EU.

## 7. Erste 30 Tage – konkreter Plan

- **Woche 1:** Claude-API-Backend live, Demo öffentlich erreichbar deployen.
- **Woche 2:** Landingpage online, 20 lokale Maklerbüros recherchieren.
- **Woche 3:** 10 Demo-Termine anfragen, Feedback einsammeln.
- **Woche 4:** ersten zahlenden Kunden gewinnen, Angebot nach Feedback schärfen.

Das Ziel der ersten 10.000 € ist über **eine Auftragsarbeit** (eine angepasste
Lösung für ein Büro) am schnellsten erreichbar; das SaaS-Modell skaliert danach.
