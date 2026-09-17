function isCoordinatePair(value) {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]));
}

function geometryCoordinates(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') return geometry.coordinates?.[0] ?? null;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates?.[0]?.[0] ?? null;
  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries ?? []) {
      const coordinates = geometryCoordinates(child);
      if (coordinates) return coordinates;
    }
  }
  return null;
}

export function extractBoundaryCoordinates(input) {
  const features = input?.type === 'FeatureCollection'
    ? input.features ?? []
    : input?.type === 'Feature'
      ? [input]
      : [{ geometry: input }];

  for (const feature of features) {
    const coordinates = geometryCoordinates(feature?.geometry);
    if (coordinates?.length >= 3 && coordinates.every(isCoordinatePair)) {
      return coordinates.map(([x, y]) => [Number(x), Number(y)]);
    }
  }

  throw new Error('The file does not contain a polygon boundary.');
}

export function boundaryToCanvasPoints(coordinates, width, height, padding = 24) {
  if (!coordinates?.length) return [];
  const xs = coordinates.map(([x]) => x);
  const ys = coordinates.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  return coordinates.map(([x, y]) => ({
    x: offsetX + (x - minX) * scale,
    y: height - (offsetY + (y - minY) * scale),
  }));
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createPassLogCsv({ field, coverage, appliedAcres, averageRate, overlap, skip, elapsedTime }) {
  const rows = [
    ['Metric', 'Value'],
    ['Field', `${field.name} · ${field.commodity} · ${field.acreage.toFixed(1)} ac`],
    ['Coverage %', coverage],
    ['Applied acres', appliedAcres],
    ['Average rate (GAL/AC)', averageRate],
    ['Overlap acres', overlap],
    ['Skip acres', skip],
    ['Elapsed time', elapsedTime],
  ];

  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')}\r\n`;
}
