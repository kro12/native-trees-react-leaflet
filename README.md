# Native Trees Map

[![CI](https://github.com/kro12/native-trees-react-leaflet/actions/workflows/ci.yml/badge.svg)](https://github.com/kro12/native-trees-react-leaflet/actions/workflows/ci.yml)

An interactive map-based application for exploring ancient woodland and native tree habitats.  
The project visualises geospatial habitat data, allowing users to filter by county and species, inspect individual sites, and explore data at different zoom levels.

This repository focuses on clarity, correctness, and maintainability across UI, state management, data handling, and tooling.

---

## Overview

Native Trees Map is a React + TypeScript application built with Vite and Leaflet.  
It loads habitat data, displays it on an interactive map, and provides multiple ways to explore and interrogate that data:

- County-based filtering
- Species-based filtering
- Marker clustering and polygon rendering at different zoom levels
- Rich popups with contextual habitat information
- Context menus and subtle visual feedback for map interactions

The application is structured to keep domain logic, UI components, and infrastructure concerns clearly separated.

---

## Why I Built This

I wanted to build something that sat between a prototype and a production-ready application.

Mapping and geospatial UIs tend to surface real-world complexity very quickly:
async data loading, large datasets, conditional rendering by zoom level, and tricky third‑party APIs.  
This project was an opportunity to work through those constraints carefully and deliberately, while keeping the codebase readable and testable.

Rather than optimising for novelty, the goal was to optimise for _clarity_:  
clear data flow, explicit state transitions, and tooling that supports change over time.

---

## Key Features

- **Interactive Leaflet map**
  - Tile layer switching (street, satellite, terrain)
  - Marker clustering at low zoom levels
  - Polygon rendering at higher zoom levels

- **Filtering**
  - County selection
  - Species selection with “select all” behaviour
  - Dynamic site counts based on active filters

- **Progressive disclosure**
  - Markers at low zoom
  - Habitat polygons at higher zoom
  - Visual pulse when entering polygon view

- **Rich UI interactions**
  - Draggable control panel
  - Context menu on map features
  - Detailed popup cards rendered via React portals

- **Robust testing**
  - Unit tests for utilities
  - Component tests for isolated UI logic
  - Integration-style tests for the main App flow

---

## Tech Stack

- **React 18**
- **TypeScript**
- **Vite**
- **Leaflet / react-leaflet**
- **Vitest**
- **React Testing Library**
- **ESLint (flat config)**
- **Prettier**

---

## Project Structure

The structure is intentionally explicit rather than clever:

```
src/
├─ assets/
├─ components/
│  ├─ context_menu.tsx
│  ├─ county_zoomer.tsx
│  ├─ detailed_popup_card.tsx
│  ├─ habitat_markers.tsx
│  ├─ map_ref_capture.tsx
│  ├─ species_filter.tsx
│  ├─ zoom_tracker.tsx
│  └─ tests/
├─ hooks/
│  ├─ useContextMenu.tsx
│  └─ useFlashPolygons.tsx
├─ tests/
│  ├─ fixtures/
│  │  └─ habitats.ts
│  └─ App.test.tsx
├─ constants.ts
├─ utils.ts
├─ utils.test.ts
├─ App.tsx
├─ main.tsx
└─ index.css
```

**Notes:**

- `constants.ts` contains shared domain types and configuration.
- `utils.ts` holds pure data/logic helpers.
- Test fixtures live alongside tests but remain strongly typed.
- Leaflet-specific behaviour is isolated to keep React components predictable.

---

## Testing Strategy

Testing is layered rather than exhaustive:

- **Unit tests**
  - Pure utilities and data transformation logic

- **Component tests**
  - Focused tests for individual UI components

- **Integration tests**
  - App-level tests that exercise realistic user flows:
    - loading data
    - selecting counties
    - switching map layers
    - zoom-triggered rendering behaviour

Mocks are used selectively to avoid testing Leaflet internals while still validating integration points.

The project uses a lightweight GitHub Actions workflow to ensure formatting, linting, type safety, tests, and builds remain green.

---

### Bundle analysis & code splitting

Leaflet and its React bindings account for a significant portion of the production bundle size.

During development, the build was analysed using `rollup-plugin-visualizer` to understand bundle composition. Based on this, an optional manual chunk is defined for Leaflet-related dependencies:

````ts
manualChunks: {
  leaflet: ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
}

---

## Development

### Install dependencies

```bash
npm install
````

### Run the dev server

```bash
npm run dev
```

### Run tests

```bash
npm run test
```

### Lint & typecheck

```bash
npm run lint
npm run typecheck
```

### Production build

```bash
npm run build
```

---

## Notes on Tooling

This project uses:

- ESLint **flat config**
- Multiple TypeScript configs for app, tests, and tooling

That separation is intentional and helps keep editor feedback, tests, and builds aligned without overloading a single config.

---

## Future Improvements

- Heatmap visualisation of species density or habitat concentration
- Time‑based layers to compare historical woodland coverage
- Improved accessibility for map controls
- Server‑side data preprocessing for larger datasets
- Optional hosted demo

---

## Data Source

The spatial data used in this project is derived from the **National Survey of Native Woodlands (NSNW)** dataset published by the Irish **National Parks & Wildlife Service**.

- **Dataset**: _NSNW Woodland Habitats 2010_
- **Original format**: ESRI Shapefile (`.shp`, `.dbf`, `.shx`, etc.)
- **Reference document**: _National Survey of Native Woodlands 2003–2008_

The original shapefile data was converted to **GeoJSON** for use in a web‑mapping context.  
Conversion was performed using an online GIS conversion tool prior to ingestion into the application.

The application does not modify or reinterpret the underlying dataset beyond format conversion and client‑side filtering.

---

## Testing

The project includes both unit and integration tests:

- Component‑level unit tests
- Full App integration tests with mocked Leaflet and map primitives
- Typed fixtures shared across tests to ensure consistency with domain models

Tests are designed to verify real user flows rather than implementation details.

Run tests with:

```bash
npm run test
```

---

## CI

A GitHub Actions workflow runs on every push to:

- Check formatting
- Run ESLint
- Type-check the project
- Execute the test suite
- Build the app

This keeps the repository in a consistently healthy state even as dependencies or tooling evolve.

---

## Optional bundle analysis

For occasional performance exploration, the repo includes **optional build visualisation** using `rollup-plugin-visualizer`.

When enabled, it generates a treemap showing which dependencies contribute most to bundle size.  
This is **disabled by default** and intended as a learning and inspection tool rather than production setup.

---

## Why I Built This

I wanted to explore the intersection of **frontend engineering**, **geospatial data**, and **real‑world datasets**.

Mapping applications introduce a unique set of challenges, asynchronous data loading, imperative APIs, spatial performance concerns, and complex UI state. This project was an opportunity to design a clean React architecture around those constraints while keeping the codebase well‑typed, testable, and maintainable.

The subject matter, Ireland’s native woodlands, also made it a rewarding dataset to work with and explore.

---

## License

This project is provided for educational and demonstration purposes.  
Dataset ownership and attribution remain with the National Parks & Wildlife Service.
