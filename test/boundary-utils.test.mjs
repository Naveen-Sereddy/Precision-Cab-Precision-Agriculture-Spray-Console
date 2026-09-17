import assert from 'node:assert/strict';
import test from 'node:test';

import { createPassLogCsv, extractBoundaryCoordinates } from '../src/boundary-utils.mjs';

test('extracts the outer ring from a GeoJSON polygon feature', () => {
  const coordinates = extractBoundaryCoordinates({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]]],
    },
  });

  assert.deepEqual(coordinates, [[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]]);
});

test('creates a downloadable pass-log CSV with the required measurements', () => {
  const csv = createPassLogCsv({
    field: { name: 'Willow Creek', commodity: 'Soybeans', acreage: 42.3 },
    coverage: '98.7',
    appliedAcres: '42.3',
    averageRate: '17.6',
    overlap: '1.9',
    skip: '0.4',
    elapsedTime: '02:18',
  });

  assert.equal(csv, [
    'Metric,Value',
    'Field,Willow Creek · Soybeans · 42.3 ac',
    'Coverage %,98.7',
    'Applied acres,42.3',
    'Average rate (GAL/AC),17.6',
    'Overlap acres,1.9',
    'Skip acres,0.4',
    'Elapsed time,02:18',
    '',
  ].join('\r\n'));
});
