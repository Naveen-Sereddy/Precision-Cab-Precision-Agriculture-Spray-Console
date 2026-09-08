# Precision Cab

[![Verify site](https://github.com/Naveen-Sereddy/Precision-Cab-Precision-Agriculture-Spray-Console/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/Naveen-Sereddy/Precision-Cab-Precision-Agriculture-Spray-Console/actions/workflows/verify.yml)

**Every pass, precisely applied.**

An in-cab console prototype for GPS-guided precision spray application. 11 screens cover the operator flow (field selection, live guided application, rate changes, boom fault handling, pass summaries, scouting, offline sync, and settings), built as a single interactive React app with an industrial-console visual language.

**Project type:** Technical product prototype.

**Status:** Interactive demonstration using representative telemetry data; it is not a certified vehicle-control system.

## Screenshots

<img width="1440" height="900" alt="Cab home, live application telemetry and field map" src="screenshots/hero-cab-home.png" />

<img width="1440" height="900" alt="Field select with satellite and NDVI map modes" src="screenshots/hero-field-select.png" />

<img width="1440" height="900" alt="Active pass, guidance overlay, boom diagram, pass metrics" src="screenshots/hero-active-pass.png" />

<img width="1440" height="900" alt="Boom fault alert requiring immediate action" src="screenshots/hero-boom-fault.png" />

<img width="430" height="900" alt="Handheld layout of the cab home screen" src="screenshots/hero-mobile.png" />

## Features

- Full operator flow across 11 screens: cab home, field select, active pass guidance, rate change, boom fault, pass summary, scouting capture, offline sync queue, empty/no-boundary state, permission-denied state, settings
- Built-in device switcher (Cab console / Tablet / Handheld) for previewing every breakpoint without resizing the browser, driven by CSS container queries so it reflects the same layout a real narrow viewport would render
- Offline sync queue simulation: queued items transition through waiting → syncing → synced with staggered timing
- Rate-change keypad with live tank-mix math (gallons needed for the new rate, tank reserve remaining)
- Boom section diagram reflects stopped/fault state consistently across the home, active pass, and alert screens
- Field map rendered as SVG with satellite/NDVI mode toggle, guidance lines, and applied/overlap/skip coverage overlays
- Dual ambient modes: a high-contrast Sunlight Glare palette and a low-lumen Dark Cab palette, with distinct active, stopped, and fault boom states in both modes
- ISOBUS Class 3 section-control and NMEA 0183 GPGGA/GPVTG message shapes are documented in `specs/isobus-telemetry.json`
- Offline edge behavior, IndexedDB coverage logging, FIFO sync states, and the shared boom safety state are documented in `docs/01-edge-telemetry-architecture.md`

## Tech stack

React 19, Vite 8, Tailwind CSS 4 (via `@tailwindcss/vite`), `lucide-react` for icons. No backend, router, or state-management library is bundled in this prototype. Screens are plain functions switched by a single `useState`; telemetry is representative UI data.

## Implemented vs proposed

**Implemented in this repository:** The screen registry, device-size preview, representative telemetry UI, SVG field-map states, rate-change math, simulated offline sync transitions, and structural/build verification.

**Proposed or future work:** Real GPS/ECU/ISOBUS/NMEA integration, durable IndexedDB synchronization, production authentication, and certified vehicle-control behavior. The architecture document describes these boundaries; the prototype does not implement them.

## Project structure

```
src/
  main.jsx       # every screen component, app shell, and state
  styles.css     # design tokens, component styles, container-query breakpoints
specs/
  isobus-telemetry.json
docs/
  01-edge-telemetry-architecture.md
index.html       # entry point
vite.config.js   # Vite + React + Tailwind plugin config
screenshots/     # screenshots used in this README
```

## Architecture

The whole app lives in one component tree in `main.jsx`. Screens are keyed in a `SCREENS` array and switched via a `renderScreen()` function on top-level `useState`. No route matching library.

Responsive layout runs on CSS container queries scoped to `.preview-shell`, not `@media`. The prototype's own device switcher (Cab console / Tablet / Handheld) only ever changes that container's `max-width`. It doesn't resize the real browser window. Media queries keyed to viewport width would never fire from that switcher, so the in-app mobile preview would silently render the desktop layout. Container queries respond to the container's rendered width instead, so switching device mode and shrinking the real window produce identical, correct breakpoint behavior.

## Getting started

```bash
npm install
npm run check
npm run dev
```

Open the printed local URL. `npm run build` produces a production build in `dist/`.

`npm run check` validates the 11-screen registry, named container breakpoints, 64px touch-target floor, and the ISOBUS/NMEA specification before a build.

`portfolio.sync.json` describes capture outputs written to the separate portfolio site. Those generated images are intentionally not stored in this repository.

## Documentation

- [Edge and telemetry architecture](docs/01-edge-telemetry-architecture.md)
- [ISOBUS/NMEA specification](specs/isobus-telemetry.json)
- [Portfolio synchronization metadata](portfolio.sync.json)

## Future improvements

- Real GPS/telemetry integration in place of the fixed mock coordinates and rates
- IndexedDB persistence for the sync queue instead of the current in-memory simulation
- General-purpose routes and persistent screen state. The Portfolio refresh workflow can already open a stable capture state with `?captureScreen=<screen>&captureDevice=<console|tablet|phone>`.

## License

MIT, see [LICENSE](LICENSE).
