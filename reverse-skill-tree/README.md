# Project Tree

Eine Web-App zur hierarchischen Projektzerlegung. Hauptziele werden in Unterziele zerlegt (beliebig tief), man arbeitet sich von den kleinsten Aufgaben nach oben zum Hauptziel vor.

## Features

- **Hierarchische Zielstruktur** - Hauptziele, Unterziele, Teilziele (beliebig tief)
- **Automatische Fortschrittsberechnung** - Zeigt an wie viele Unterziele erledigt sind
- **Auto-Complete** - Elternknoten werden automatisch grün wenn alle Kinder erledigt sind
- **Visuelle Unterscheidung** - Verschiedene Farben pro Hierarchie-Ebene
- **Einfache Bedienung** - Plus-Button zum Hinzufügen, DEL-Taste zum Löschen
- **Export/Import** - JSON und PDF Export
- **Zoom, Pan & Minimap** - Übersichtliche Navigation auch bei großen Bäumen
- **Lokale Speicherung** - Daten bleiben im Browser erhalten (IndexedDB)
- **Mehrere Projekte** - Verschiedene Zielbäume verwalten

## Tech-Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Zustand (State Management)
- React Flow (Baum-Visualisierung)
- Dexie.js (IndexedDB)

## Installation

```bash
npm install
npm run dev
```

## Verwendung

1. Neues Projekt erstellen
2. "Ziel hinzufügen" klicken für ein Hauptziel
3. Plus-Button am Ziel klicken für Unterziele
4. Ziele anklicken zum Bearbeiten (Status, Priorität, Beschreibung)
5. Status auf "Abgeschlossen" setzen - Fortschritt wird automatisch berechnet

## Lizenz

MIT
