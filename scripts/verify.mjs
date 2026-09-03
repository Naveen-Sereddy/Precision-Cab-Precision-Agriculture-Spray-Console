import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const appPath = resolve(root, 'src/main.jsx');
const stylesPath = resolve(root, 'src/styles.css');
const specPath = resolve(root, 'specs/isobus-telemetry.json');

const [app, styles, specText] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(stylesPath, 'utf8'),
  readFile(specPath, 'utf8'),
]);

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const screenBlock = app.match(/const SCREENS = \[([\s\S]*?)\n\];/);
const screenEntries = screenBlock ? [...screenBlock[1].matchAll(/\['([^']+)',\s*'[^']+',\s*([A-Za-z_$][\w$]*)\]/g)] : [];
const screenPairs = screenEntries.map((entry) => [entry[1], entry[2]]);
const screenIds = screenPairs.map(([id]) => id);
check(screenEntries.length === 11, `Expected 11 registered operator screens, found ${screenEntries.length}.`);
check(new Set(screenIds).size === screenIds.length, 'SCREENS contains duplicate route ids.');
for (const [id, component] of screenPairs) {
  check(new RegExp(`\\b${component}\\b`).test(app), `Screen ${id} references missing icon component ${component}.`);
  check(new RegExp(`case ['"]${id}['"]\\s*:`).test(app), `Screen ${id} has no renderScreen case.`);
}

check(/--touch-min\s*:\s*64px/.test(styles), '64px touch target token is missing.');
check(/min-height\s*:\s*var\(--touch-min\)/.test(styles), 'Interactive controls are not tied to the 64px touch target token.');
check(/@container\s+console\s*\([^)]*1440px/.test(styles), 'Console 1440px container query is missing.');
check(/@container\s+console\s*\([^)]*1024px/.test(styles), 'Tablet 1024px container query is missing.');
check(/@container\s+console\s*\([^)]*430px/.test(styles), 'Handheld 430px container query is missing.');
check(/data-theme=\{nightMode/.test(app) && /mode-toggle/.test(app), 'Night mode is not wired into the console shell and header toggle.');
check(/\[data-theme="night"\]/.test(styles), 'Night mode token selector is missing.');

let spec;
try {
  spec = JSON.parse(specText);
} catch (error) {
  failures.push(`ISOBUS telemetry spec is not valid JSON: ${error.message}`);
}
if (spec) {
  const sections = spec.isobus?.boom?.sections;
  check(spec.isobus?.taskController?.class === 3, 'ISOBUS Task Controller must be Class 3.');
  check(spec.isobus?.boom?.sectionCount === 9 && sections?.length === 9, 'ISOBUS boom must define nine sections.');
  check(sections?.every((section) => Number.isFinite(section.nozzleLatencyMs)), 'Every boom section needs a nozzle latency offset in milliseconds.');
  check(Array.isArray(spec.isobus?.boom?.automaticSectionShutoff?.rules) && spec.isobus.boom.automaticSectionShutoff.rules.length > 0, 'Automatic section shutoff rules are missing.');
  check(Boolean(spec.nmea0183?.sentences?.GPGGA) && Boolean(spec.nmea0183?.sentences?.GPVTG), 'GPGGA and GPVTG parser contracts are required.');
}

if (failures.length) {
  console.error(`Precision Cab verification failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Precision Cab verification passed: ${screenPairs.length} screens, 64px touch floor, named container breakpoints (1440/1024/430), valid ISOBUS/NMEA spec.`);
}
