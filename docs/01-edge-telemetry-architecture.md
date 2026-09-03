# Edge telemetry architecture

Precision Cab treats the in-cab console as the safety-critical edge of the system. A connectivity gap must not interrupt guidance, change a section state late, or discard an operator's record.

## Offline-first coverage records

Pass coverage logs are written to an IndexedDB store before the UI acknowledges them. Each record includes the field identifier, GPS position, section states, rate, timestamp, and a schema version. The console can continue to render guidance and collect records when the cellular link is unavailable; sync is a transport concern, not a prerequisite for safe application.

## FIFO sync queue

The queue preserves operator order. New records enter `waiting`, move to `syncing` when the edge client has a usable connection, and become `synced` only after the cloud acknowledges the complete payload. A failed attempt returns the record to `waiting` and uses exponential backoff (1s, 2s, 4s, 8s, capped at 60s) with jitter so a rural cell dropout does not create a retry storm. The visible queue is deliberately explicit: the operator can see what is local, what is in flight, and what has been confirmed.

## Safety state machine

`BoomDiagram` is the single presentation source for the physical boom state. Sensor input is normalized into `active`, `stopped`, or `fault` before it reaches any screen; home, active-pass, and alert views consume that same state. A fault or commanded stop therefore changes the diagram without an intermediate screen-specific interpretation. The UI state machine is a display contract—the physical controller remains authoritative for the actual valve and pump action.

The ISOBUS Class 3 and NMEA 0183 message shapes are documented in [`specs/isobus-telemetry.json`](../specs/isobus-telemetry.json). This repository models the console boundary and safety behavior; it does not claim to contain a certified vehicle ECU implementation.
