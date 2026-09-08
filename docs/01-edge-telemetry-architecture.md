# Edge telemetry architecture

This document describes the proposed production architecture around the Precision Cab prototype. The current repository implements the presentation states and interaction simulations; it does not implement vehicle connectivity, persistent coverage storage, or a certified control path.

## Implemented in the current prototype

- Representative telemetry values and fixed mock coordinates
- In-memory React state for screen, rate, boom, night-mode, and sync-queue demonstrations
- A visible `waiting` → `syncing` → `synced` queue simulation using staggered timers
- Shared display state for active, stopped, and fault boom presentations
- ISOBUS and NMEA message shapes documented in [`specs/isobus-telemetry.json`](../specs/isobus-telemetry.json)

The UI state is a presentation contract only. It does not control a vehicle, pump, boom, or spray application.

## Proposed production architecture

Precision Cab treats the in-cab console as the safety-critical edge of the system. A production connectivity gap must not interrupt guidance, change a section state late, or discard an operator's record.

### Offline-first coverage records

In a production implementation, pass coverage logs would be written to an IndexedDB store before the UI acknowledges them. Each record would include the field identifier, GPS position, section states, rate, timestamp, and a schema version. The current prototype does not persist these records.

### FIFO sync queue

In a production implementation, the queue would preserve operator order. New records would enter `waiting`, move to `syncing` when the edge client has a usable connection, and become `synced` only after the cloud acknowledges the complete payload. A failed attempt would return the record to `waiting` with exponential backoff and jitter. The current prototype simulates the visible state transitions and does not implement durable retry behavior.

### Safety state machine

In a production implementation, sensor input would be normalized into `active`, `stopped`, or `fault` before it reaches the UI; home, active-pass, and alert views would consume that shared state. The current prototype models those display states with React state. The physical controller would remain authoritative for actual valve and pump action.

This repository models the console boundary and proposed safety behavior; it does not claim to contain a certified vehicle ECU implementation.
