import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown,
  ChevronRight, CircleDot, CloudOff, Droplets, Expand, Gauge, Keyboard,
  Layers3, LockKeyhole, MapPin, Mic, Moon, Navigation, Pause, Play, Plus,
  Radio, RotateCcw, Satellite, ScanLine, Settings2, Square, Sun,
  Upload, Volume2, WifiOff, X
} from 'lucide-react';
import { captureStateFromSearch } from './capture-state.mjs';
import { boundaryToCanvasPoints, createPassLogCsv, extractBoundaryCoordinates } from './boundary-utils.mjs';
import './styles.css';

const SCREENS = [
  ['home', 'Cab home', Gauge],
  ['field', 'Field select', MapPin],
  ['active', 'Active pass', Navigation],
  ['sync', 'Sync queue', ArrowDownToLine],
  ['rate', 'Rate change', Keyboard],
  ['alert', 'Boom fault', AlertTriangle],
  ['summary', 'Pass summary', ScanLine],
  ['scout', 'Scouting', CircleDot],
  ['empty', 'New field', Plus],
  ['denied', 'Permission', LockKeyhole],
  ['settings', 'Settings', Settings2],
];

const queueSeed = [
  { id: 'q1', title: 'Spray log · North 80', meta: '156.8 ac · 10:42', state: 'waiting' },
  { id: 'q2', title: 'Coverage grid · Willow', meta: '42.3 ac · 10:26', state: 'waiting' },
  { id: 'q3', title: 'Scout pin · N 40', meta: '41.35821, −93.56244', state: 'waiting' },
];

const FIELD_DEFINITIONS = [
  {
    id: 'north', name: 'North 80', commodity: 'Corn', acreage: 156.8,
    speed: '11.8', targetRate: 17.5, actualRate: '17.6', tank: '810', tankUnit: 'GAL · 61%',
    coordinates: '41.35821, −93.56244', boomSections: 9,
    passLog: { coverage: '98.7', appliedAcres: '154.8', averageRate: '17.6', overlap: '1.9', skip: '0.4', elapsedTime: '02:18' },
  },
  {
    id: 'willow', name: 'Willow Creek', commodity: 'Soybeans', acreage: 42.3,
    speed: '9.6', targetRate: 17.2, actualRate: '17.3', tank: '620', tankUnit: 'GAL · 74%',
    coordinates: '41.36214, −93.57132', boomSections: 7,
    passLog: { coverage: '97.9', appliedAcres: '41.6', averageRate: '17.3', overlap: '1.6', skip: '0.5', elapsedTime: '01:42' },
  },
  {
    id: 'east', name: 'East Quarter', commodity: 'Winter wheat', acreage: 128.1,
    speed: '10.4', targetRate: 16.8, actualRate: '16.9', tank: '705', tankUnit: 'GAL · 68%',
    coordinates: '41.34902, −93.54876', boomSections: 8,
    passLog: { coverage: '98.2', appliedAcres: '126.4', averageRate: '16.9', overlap: '1.7', skip: '0.3', elapsedTime: '02:04' },
  },
];

function IconButton({ children, className = '', ...props }) {
  return <button className={`icon-button ${className}`} {...props}>{children}</button>;
}

function StatusRing({ state = 'online', label, compact = false }) {
  return <span className={`status-ring ${state} ${compact ? 'compact' : ''}`} aria-label={label} />;
}

function Metric({ label, value, unit, accent = false }) {
  return <div className={`metric ${accent ? 'metric-alert' : ''}`}>
    <span>{label}</span>
    <strong className="mono">{value}</strong>
    {unit && <em>{unit}</em>}
  </div>;
}

function FieldMap({ field = FIELD_DEFINITIONS[0], mode = 'live', selected = field.id, guidance = false, overlay = false, compass = true }) {
  const isNDVI = mode === 'ndvi';
  return <div className={`field-map ${guidance ? 'guidance-map' : ''} ${overlay ? 'summary-map' : ''}`} aria-label={`${field.name} field map`} data-field-id={field.id}>
    <svg viewBox="0 0 820 470" preserveAspectRatio="none" role="img" aria-label={`${field.name} field boundary and equipment position`}>
      <defs>
        <pattern id="rows" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)">
          <line x1="0" y1="0" x2="0" y2="36" stroke="currentColor" strokeWidth="2" opacity=".16" />
        </pattern>
        <pattern id="coverage" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)">
          <rect width="27" height="42" fill="currentColor" opacity=".28" />
        </pattern>
      </defs>
      <rect width="820" height="470" fill="var(--map-ground)" />
      <path d="M-10 105 C150 80 245 125 365 91 S 615 82 850 125" className="contour" />
      <path d="M-10 363 C145 330 236 380 369 343 S 611 344 850 311" className="contour" />
      <path d="M88 55 L637 42 L741 153 L675 407 L184 426 L66 274 Z" className={`field-boundary ${selected === 'north' ? 'selected' : ''}`} />
      <path d="M88 55 L637 42 L741 153 L675 407 L184 426 L66 274 Z" fill={isNDVI ? 'var(--ndvi)' : 'url(#rows)'} className="field-fill" />
      {overlay && <path d="M88 55 L637 42 L741 153 L675 407 L184 426 L66 274 Z" fill="url(#coverage)" className="coverage" />}
      {guidance && <>
        <line x1="112" y1="294" x2="715" y2="213" className="guide-line" />
        <line x1="112" y1="333" x2="715" y2="252" className="guide-line dim" />
        <line x1="112" y1="255" x2="715" y2="174" className="guide-line dim" />
      </>}
      <path d="M487 164 l15 30 -15 29 -15 -29 Z" className="vehicle" />
      <circle cx="487" cy="194" r="31" className="vehicle-ring" />
      {overlay && <>
        <path d="M193 91 L250 82 L267 414 L209 420 Z" className="overlap-strip" />
        <path d="M610 62 L636 62 L670 181 L643 183 Z" className="skip-strip" />
      </>}
    </svg>
    {compass && <div className="map-compass">N<span>↑</span></div>}
    {mode !== 'live' && <div className="map-key"><span className="map-swatch"></span>{isNDVI ? 'NDVI vigor' : 'Satellite'}</div>}
    {overlay && <div className="coverage-key"><span className="solid-swatch"></span>Applied <span className="stripe-swatch"></span>Overlap <span className="dash-swatch"></span>Skip</div>}
  </div>;
}

function BoomDiagram({ field = FIELD_DEFINITIONS[0], stopped = false, fault = false }) {
  return <div className="boom-diagram" aria-label={`${field.name} boom section status`} data-field-id={field.id}>
    <span className="boom-side">L</span>
    {[1,2,3,4,5,6,7,8,9].map((part) => <span key={part} className={`boom-section ${part > field.boomSections ? 'inactive' : ''} ${stopped ? 'stopped' : ''} ${fault && part === 7 ? 'fault' : ''}`} />)}
    <span className="boom-side">R</span>
  </div>;
}

function TelemetryPanel({ field = FIELD_DEFINITIONS[0], rate, boomStopped, onScreen }) {
  return <aside className="telemetry-panel" data-field-id={field.id}>
    <div className="telemetry-head">
      <div><span className="eyebrow">LIVE APPLICATION</span><h2>{field.name}</h2><p className="telemetry-field-meta">{field.commodity} · {field.acreage.toFixed(1)} ac</p></div>
      <StatusRing state={boomStopped ? 'offline' : 'online'} label={boomStopped ? 'Boom stopped' : 'Boom online'} />
    </div>
    <div className="metric-grid">
      <Metric label="GROUND SPEED" value={field.speed} unit="MPH" />
      <Metric label="TARGET RATE" value={rate.toFixed(1)} unit="GAL/AC" />
      <Metric label="ACTUAL RATE" value={field.actualRate} unit="GAL/AC" />
      <Metric label="TANK" value={field.tank} unit={field.tankUnit} />
    </div>
    <BoomDiagram field={field} stopped={boomStopped} />
    <div className="telemetry-footer"><Navigation size={24} /> <span className="mono">{field.coordinates}</span></div>
    {onScreen && <button className="text-action" onClick={() => onScreen('active')}>Open guidance <ArrowRight size={22}/></button>}
  </aside>;
}

function CabHome({ field = FIELD_DEFINITIONS[0], rate, boomStopped, onScreen, sheetOpen, setSheetOpen }) {
  return <section className="screen home-screen" data-field-id={field.id}>
    <div className="screen-heading"><div><span className="eyebrow">OPERATION IN PROGRESS</span><h1>{field.name} · {field.commodity}</h1><p className="screen-subtitle">{field.acreage.toFixed(1)} ac loaded</p></div><div className="header-status"><StatusRing state={boomStopped ? 'offline' : 'online'} label="GPS connected" compact /> GPS RTK <span className="mono">±0.8 in</span></div></div>
    <div className="home-layout">
      <FieldMap field={field} guidance />
      <TelemetryPanel field={field} rate={rate} boomStopped={boomStopped} onScreen={onScreen} />
    </div>
    <button className="sheet-handle" onClick={() => setSheetOpen(!sheetOpen)} aria-expanded={sheetOpen}>Live telemetry <ChevronDown size={24}/></button>
    <div className={`telemetry-sheet ${sheetOpen ? 'open' : ''}`}><TelemetryPanel field={field} rate={rate} boomStopped={boomStopped} onScreen={onScreen} /></div>
  </section>;
}

function FieldSelect({ onLoad }) {
  const [mapMode, setMapMode] = useState('satellite');
  const [field, setField] = useState('north');
  const selectedField = FIELD_DEFINITIONS.find((entry) => entry.id === field) ?? FIELD_DEFINITIONS[0];
  return <section className="screen field-screen">
    <div className="screen-heading"><div><span className="eyebrow">SELECT A BOUNDARY</span><h1>Fields ready to spray</h1></div><div className="segmented"><button className={mapMode === 'satellite' ? 'active' : ''} onClick={() => setMapMode('satellite')}><Satellite size={22}/>Satellite</button><button className={mapMode === 'ndvi' ? 'active' : ''} onClick={() => setMapMode('ndvi')}><Layers3 size={22}/>NDVI</button></div></div>
    <div className="field-select-layout">
      <FieldMap field={selectedField} mode={mapMode === 'ndvi' ? 'ndvi' : 'satellite'} selected={field} />
      <div className="field-list">{FIELD_DEFINITIONS.map((entry) => <button key={entry.id} className={`field-row ${field === entry.id ? 'selected' : ''}`} onClick={() => setField(entry.id)}><StatusRing state={field === entry.id ? 'online' : 'offline'} /><span><strong>{entry.name}</strong><em>{entry.commodity} · {entry.acreage.toFixed(1)} ac</em></span><ChevronRight size={28}/></button>)}</div>
    </div>
    <button className="primary-action" onClick={() => onLoad?.(selectedField)}>Load {selectedField.name} <ArrowRight size={28}/></button>
  </section>;
}

function ActivePass({ field = FIELD_DEFINITIONS[0], rate, boomStopped, setBoomStopped }) {
  return <section className="screen active-screen" data-field-id={field.id}>
    <div className="active-top"><button className="back-action"><ArrowLeft size={28}/>{field.name}</button><div className="pass-title"><span className="eyebrow">PASS 18 OF 24</span><h1 className="mono">+0.0 IN</h1></div><div className="active-rate"><span>TARGET</span><strong className="mono">{rate.toFixed(1)} <em>GAL/AC</em></strong></div></div>
    <div className="active-map-wrap">
      <FieldMap field={field} guidance compass={false} />
      <div className="guidance-overlay"><div><span>LEFT / RIGHT</span><strong className="mono">0.0 IN</strong></div><div><span>HEADING</span><strong className="mono">274°</strong></div></div>
    </div>
    <div className="active-bottom"><BoomDiagram field={field} stopped={boomStopped} /><div className="pass-metrics"><Metric label="SPEED" value={field.speed} unit="MPH"/><Metric label="APPLIED" value={field.passLog.appliedAcres} unit="AC"/><Metric label="TANK" value={field.tank} unit="GAL"/></div><button className="outline-action" onClick={() => setBoomStopped(!boomStopped)}>{boomStopped ? <Play size={26}/> : <Pause size={26}/>} {boomStopped ? 'Resume boom' : 'Pause boom'}</button></div>
  </section>;
}

function SyncQueue({ queue, syncOpen, setSyncOpen, docked }) {
  const syncing = queue.some((item) => item.state === 'syncing');
  const synced = queue.every((item) => item.state === 'synced');
  return <section className={`sync-queue ${docked ? 'docked' : ''} ${syncOpen ? 'open' : ''}`}>
    <button className="sync-toggle" onClick={() => setSyncOpen(!syncOpen)} aria-expanded={syncOpen}><span><CloudOff size={26}/><strong>Offline sync queue</strong><em className="mono">{synced ? '0 pending' : `${queue.filter(q => q.state !== 'synced').length} pending`}</em></span><ChevronDown size={26}/></button>
    <div className="sync-content">{queue.map((item) => <div className={`sync-item ${item.state}`} key={item.id}><StatusRing state={item.state === 'synced' || item.state === 'syncing' ? 'online' : 'offline'} /><div><strong>{item.title}</strong><em>{item.state === 'synced' ? 'Synced to Operations Cloud' : item.meta}</em></div>{item.state === 'synced' ? <Check size={26}/> : item.state === 'syncing' ? <RotateCcw className="spin" size={26}/> : <CloudOff size={26}/>}</div>)}<div className="sync-actions"><span className="mono">LAST CONNECTION 10:44:18</span>{!synced && <button className="primary-action compact-action" disabled={syncing} onClick={() => window.dispatchEvent(new Event('precision-sync'))}>{syncing ? 'Syncing…' : 'Sync now'} <Upload size={24}/></button>}</div></div>
  </section>;
}

function RateChange({ rate, setRate, onScreen }) {
  const [entered, setEntered] = useState(String(rate.toFixed(1)));
  const nextRate = Number(entered || 0);
  const acresLeft = 43.2;
  const currentNeed = acresLeft * rate;
  const nextNeed = acresLeft * nextRate;
  const difference = nextNeed - currentNeed;
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','←'];
  const press = (key) => {
    if (key === '←') return setEntered((value) => value.slice(0, -1));
    if (key === '.' && entered.includes('.')) return;
    if (entered.replace('.', '').length >= 4) return;
    setEntered((value) => value === '0.0' ? key : `${value}${key}`);
  };
  return <section className="screen rate-screen">
    <div className="screen-heading"><div><span className="eyebrow">APPLICATION RATE</span><h1>Confirm rate change</h1></div><StatusRing state="offline" label="Change requires confirmation"/></div>
    <div className="rate-layout"><div className="rate-entry"><span className="eyebrow">NEW TARGET RATE</span><div className="rate-readout mono">{entered || '0'} <em>GAL/AC</em></div><div className="keypad">{keys.map((key) => <button key={key} onClick={() => press(key)}>{key === '←' ? <X size={28}/> : key}</button>)}</div></div><div className="mix-math"><h2>Tank mix math</h2><div className="math-row"><span>Current plan · {rate.toFixed(1)} GAL/AC</span><strong className="mono">{currentNeed.toFixed(0)} GAL</strong></div><div className="math-row"><span>New plan · {Number.isFinite(nextNeed) ? nextRate.toFixed(1) : '—'} GAL/AC</span><strong className="mono">{Number.isFinite(nextNeed) ? `${nextNeed.toFixed(0)} GAL` : '—'}</strong></div><div className="math-total"><span>Change for remaining 43.2 AC</span><strong className="mono">{difference >= 0 ? '+' : ''}{Number.isFinite(difference) ? difference.toFixed(0) : '—'} GAL</strong></div><div className="tank-note"><Droplets size={28}/><span>810 GAL in tank · {Number.isFinite(nextNeed) ? Math.max(0, 810 - nextNeed).toFixed(0) : '—'} GAL reserve after pass</span></div></div></div>
    <button className="primary-action" disabled={!nextRate || nextRate > 99} onClick={() => {setRate(nextRate); onScreen('active')}}>Confirm {nextRate.toFixed(1)} GAL/AC <Check size={28}/></button>
  </section>;
}

function BoomAlert({ boomStopped, setBoomStopped }) {
  return <section className={`screen alert-screen ${boomStopped ? 'resolved' : ''}`}>
    <div className="alert-center"><StatusRing state={boomStopped ? 'offline' : 'action'} label={boomStopped ? 'Boom stopped' : 'Immediate action required'} /><span className="eyebrow">{boomStopped ? 'BOOM HAS BEEN STOPPED' : 'IMMEDIATE ACTION REQUIRED'}</span><h1>{boomStopped ? 'Boom flow halted' : 'Section 7 flow fault'}</h1><p>{boomStopped ? 'No flow is being applied. Inspect the right-side section before resuming.' : 'Right-side Section 7 is reporting zero flow while commanded on.'}</p><BoomDiagram stopped={boomStopped} fault={!boomStopped}/>{boomStopped ? <button className="outline-action" onClick={() => setBoomStopped(false)}><Play size={28}/>Resume boom</button> : <button className="stop-action" onClick={() => setBoomStopped(true)}><Square size={28}/>STOP BOOM</button>}</div>
  </section>;
}

function downloadPassLog(field) {
  const csv = createPassLogCsv({ field, ...field.passLog });
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${field.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pass-log.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function PassSummary({ field = FIELD_DEFINITIONS[0], onScreen }) {
  const { coverage, appliedAcres, averageRate, overlap, skip, elapsedTime } = field.passLog;
  return <section className="screen summary-screen" data-field-id={field.id}><div className="screen-heading"><div><span className="eyebrow">PASS COMPLETE · {field.name.toUpperCase()}</span><h1>Measured coverage</h1></div><button className="outline-action" onClick={() => downloadPassLog(field)}><Upload size={26}/>Export log</button></div><div className="summary-layout"><FieldMap field={field} overlay/><div className="summary-stats"><Metric label="COVERAGE" value={coverage} unit="%"/><Metric label="APPLIED" value={appliedAcres} unit="AC"/><Metric label="AVERAGE RATE" value={averageRate} unit="GAL/AC"/><Metric label="OVERLAP" value={overlap} unit="AC"/><Metric label="SKIP" value={skip} unit="AC"/><Metric label="ELAPSED" value={elapsedTime} unit="HR"/></div></div><button className="primary-action" onClick={() => onScreen('field')}>Choose next field <ArrowRight size={28}/></button></section>;
}

function ScoutingCapture() {
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState(false);
  return <section className="screen scouting-outer"><div className="scouting-frame"><div className="scout-top"><button className="icon-button"><X size={28}/></button><span className="eyebrow">SCOUTING CAPTURE</span><button className="icon-button"><Settings2 size={26}/></button></div><div className={`camera-view ${captured ? 'captured' : ''}`}><div className="camera-grid"><i/><i/><i/><i/><i/><i/></div><span className="gps-chip"><MapPin size={22}/><span className="mono">41.35821, −93.56244</span></span>{captured && <div className="capture-confirm"><Check size={32}/>Pin saved · Waterhemp</div>}</div><div className="scout-controls"><button className={`voice-toggle ${recording ? 'recording' : ''}`} onClick={() => setRecording(!recording)}><StatusRing state={recording ? 'online' : 'offline'} /><Mic size={26}/><span>{recording ? 'Recording note' : 'Voice note'}</span></button><button className="shutter" onClick={() => setCaptured(true)} aria-label="Capture scouting observation"><span/></button><button className="icon-button"><MapPin size={28}/></button></div></div></section>;
}

async function readBoundaryFile(file) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.zip') || filename.endsWith('.shp')) {
    const shpModule = await import('shpjs');
    const parseShapefile = shpModule.default ?? shpModule;
    return extractBoundaryCoordinates(await parseShapefile(await file.arrayBuffer()));
  }
  if (filename.endsWith('.geojson') || filename.endsWith('.json')) {
    return extractBoundaryCoordinates(JSON.parse(await file.text()));
  }
  throw new Error('Select a .zip or .shp shapefile, or a GeoJSON file.');
}

function drawBoundaryCanvas(canvas, points) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#D8D5C8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(28, 27, 25, .16)';
  context.lineWidth = 1;
  for (let x = 20; x < canvas.width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 20; y < canvas.height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  if (!points.length) return;
  context.beginPath();
  points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
  if (points.length >= 3) context.closePath();
  context.fillStyle = 'rgba(61, 90, 69, .32)';
  if (points.length >= 3) context.fill();
  context.strokeStyle = '#3D5A45';
  context.lineWidth = 4;
  context.stroke();
  points.forEach((point) => {
    context.beginPath();
    context.fillStyle = '#F4F1EA';
    context.arc(point.x, point.y, 6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#1C1B19';
    context.lineWidth = 2;
    context.stroke();
  });
}

function BoundaryDialog({ open, onClose, onBoundaryReady }) {
  const dialogRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState('draw');
  const [drawPoints, setDrawPoints] = useState([]);
  const [importedPoints, setImportedPoints] = useState(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const activePoints = importedPoints ?? drawPoints;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasPoints = importedPoints
      ? boundaryToCanvasPoints(importedPoints, canvas.width, canvas.height)
      : drawPoints;
    drawBoundaryCanvas(canvas, canvasPoints);
  }, [drawPoints, importedPoints]);

  const resetBoundary = () => {
    setDrawPoints([]);
    setImportedPoints(null);
    setFilename('');
    setError('');
  };

  const handleCanvasClick = (event) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    setMode('draw');
    setImportedPoints(null);
    setFilename('');
    setError('');
    setDrawPoints((points) => [...points, {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    }]);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMode('import');
    setBusy(true);
    setError('');
    try {
      const coordinates = await readBoundaryFile(file);
      setImportedPoints(coordinates);
      setDrawPoints([]);
      setFilename(file.name);
    } catch (readError) {
      setImportedPoints(null);
      setFilename('');
      setError(readError instanceof Error ? readError.message : 'The boundary file could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const saveBoundary = () => {
    if (activePoints.length < 3) return;
    onBoundaryReady({ source: mode, points: activePoints, filename });
  };

  return <dialog ref={dialogRef} className="boundary-dialog" onCancel={onClose} aria-labelledby="boundary-dialog-title">
    <div className="boundary-dialog-shell">
      <div className="boundary-dialog-head"><div><span className="eyebrow">FIELD BOUNDARY</span><h2 id="boundary-dialog-title">Define a field boundary</h2></div><IconButton onClick={onClose} aria-label="Close boundary dialog"><X size={28}/></IconButton></div>
      <div className="boundary-dialog-options" aria-label="Boundary input options">
        <button type="button" className={`boundary-mode ${mode === 'draw' ? 'active' : ''}`} aria-pressed={mode === 'draw'} onClick={() => { setMode('draw'); setImportedPoints(null); setFilename(''); setError(''); }}><MapPin size={24}/><span><strong>Draw boundary</strong><em>Click points on the mini map</em></span></button>
        <button type="button" className={`boundary-mode ${mode === 'import' ? 'active' : ''}`} aria-pressed={mode === 'import'} onClick={() => fileRef.current?.click()}><Upload size={24}/><span><strong>Import boundary</strong><em>GeoJSON or shapefile bundle</em></span></button>
      </div>
      <input ref={fileRef} className="boundary-file-input" type="file" accept=".geojson,.json,.zip,.shp,application/geo+json,application/zip" onChange={handleFileChange} />
      <canvas ref={canvasRef} className="boundary-canvas" width="560" height="280" onClick={handleCanvasClick} aria-label="Mini map for tracing a field boundary" />
      <p className="boundary-status" role="status" aria-live="polite">{busy ? 'Reading boundary file…' : error || (activePoints.length >= 3 ? `${activePoints.length} boundary points ready${filename ? ` from ${filename}` : ''}.` : mode === 'draw' ? 'Click at least three points to trace the boundary.' : 'Choose a GeoJSON or shapefile to preview it here.')}</p>
      <div className="boundary-dialog-actions"><button type="button" className="text-action" onClick={resetBoundary}>Clear map</button><div><button type="button" className="outline-action" onClick={onClose}>Cancel</button><button type="button" className="primary-action" disabled={busy || activePoints.length < 3} onClick={saveBoundary}>Use this boundary <Check size={24}/></button></div></div>
    </div>
  </dialog>;
}

function EmptyState() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [captured, setCaptured] = useState(false);
  return <section className="screen simple-state"><div className="state-symbol"><MapPin size={42}/><Plus size={26}/></div><span className="eyebrow">NO FIELD BOUNDARY</span><h1>Start a new field</h1><p>{captured ? 'Boundary captured in this session.' : 'Draw a boundary from the cab or import a trusted shape file before a prescription can be loaded.'}</p><button className="primary-action" onClick={() => setDialogOpen(true)}><Plus size={28}/>Draw or import boundary</button><BoundaryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onBoundaryReady={() => { setCaptured(true); setDialogOpen(false); }} /></section>;
}

function PermissionDenied({ onScreen }) { return <section className="screen simple-state"><div className="state-symbol lock"><LockKeyhole size={42}/></div><span className="eyebrow">ACCESS RESTRICTED</span><h1>Field access denied</h1><p>Your operator account is not authorized for Willow Creek. Ask the farm manager to assign this field.</p><button className="outline-action" onClick={() => onScreen('field')}><ArrowLeft size={28}/>Back to available fields</button></section>; }

function Settings({ nightMode, setNightMode }) {
  const [glove, setGlove] = useState(true);
  const [dim, setDim] = useState(72);
  return <section className="screen settings-screen"><div className="screen-heading"><div><span className="eyebrow">CAB PREFERENCES</span><h1>Settings</h1></div></div><div className="settings-list"><div className="setting-row"><div><strong>Glove mode</strong><p>Increase spacing and confirm critical actions.</p></div><button className={`switch ${glove ? 'on' : ''}`} aria-pressed={glove} onClick={() => setGlove(!glove)}><span/></button></div><div className="setting-row"><div><strong>Ambient mode</strong><p>{nightMode ? 'Dark Cab · low-lumen night vision.' : 'Sunlight Glare · high-contrast day mode.'}</p></div><button className={`switch ${nightMode ? 'on' : ''}`} aria-label={nightMode ? 'Switch to Sunlight Glare day mode' : 'Switch to Dark Cab night mode'} aria-pressed={nightMode} onClick={() => setNightMode((value) => !value)}><span/></button></div><div className="setting-row brightness"><div><strong>Night dim</strong><p>Screen brightness after sunset.</p></div><div className="brightness-control"><Moon size={26}/><input type="range" min="20" max="100" value={dim} onChange={(event) => setDim(event.target.value)} aria-label="Night dim brightness"/><Sun size={26}/><output className="mono">{dim}%</output></div></div><div className="setting-row"><div><strong>Operator profile</strong><p>Caleb Morris · Valley Crop Services</p></div><ChevronRight size={30}/></div></div></section>;
}

function App() {
  const captureState = captureStateFromSearch(window.location.search);
  const [screen, setScreen] = useState(captureState.screen);
  const [device, setDevice] = useState(captureState.device);
  const [loadedField, setLoadedField] = useState(FIELD_DEFINITIONS[0]);
  const [rate, setRate] = useState(17.5);
  const [boomStopped, setBoomStopped] = useState(false);
  const [queue, setQueue] = useState(queueSeed);
  const [syncOpen, setSyncOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nightMode, setNightMode] = useState(captureState.nightMode);
  const docked = true;
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      setScale(Math.min(1, window.innerWidth / el.scrollWidth, window.innerHeight / el.scrollHeight));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [device, screen, sheetOpen, syncOpen]);
  useEffect(() => {
    const sync = () => {
      const waiting = queue.filter(item => item.state === 'waiting');
      if (!waiting.length) return;
      setSyncOpen(true);
      setQueue((all) => all.map((item, index) => index === 0 ? {...item, state: 'syncing'} : item));
      waiting.forEach((item, index) => setTimeout(() => {
        setQueue((all) => all.map((entry) => entry.id === item.id ? {...entry, state: 'synced'} : entry).map((entry, position) => position === index + 1 && entry.state === 'waiting' ? {...entry, state: 'syncing'} : entry));
      }, (index + 1) * 900));
    };
    window.addEventListener('precision-sync', sync);
    return () => window.removeEventListener('precision-sync', sync);
  }, [queue]);
  const loadField = (field) => {
    setLoadedField(field);
    setRate(field.targetRate);
    setBoomStopped(false);
    setSheetOpen(false);
    setScreen('home');
  };
  const renderScreen = () => {
    const props = { field: loadedField, rate, boomStopped, setBoomStopped, onScreen: setScreen, sheetOpen, setSheetOpen };
    switch (screen) {
      case 'home': return <CabHome {...props}/>;
      case 'field': return <FieldSelect onLoad={loadField}/>;
      case 'active': return <ActivePass {...props}/>;
      case 'sync': return <section className="screen sync-screen"><div className="screen-heading"><div><span className="eyebrow">OPERATIONS CLOUD</span><h1>Offline sync queue</h1></div></div><SyncQueue queue={queue} syncOpen={true} setSyncOpen={setSyncOpen} docked={false}/></section>;
      case 'rate': return <RateChange rate={rate} setRate={setRate} onScreen={setScreen}/>;
      case 'alert': return <BoomAlert boomStopped={boomStopped} setBoomStopped={setBoomStopped}/>;
      case 'summary': return <PassSummary field={loadedField} onScreen={setScreen}/>;
      case 'scout': return <ScoutingCapture/>;
      case 'empty': return <EmptyState/>;
      case 'denied': return <PermissionDenied onScreen={setScreen}/>;
      case 'settings': return <Settings nightMode={nightMode} setNightMode={setNightMode}/>;
      default: return <CabHome {...props}/>;
    }
  };
  return <div className="fit-stage" data-theme={nightMode ? 'night' : 'day'}>
    <main ref={stageRef} className={`app ${device} antialiased`} data-device={device} data-theme={nightMode ? 'night' : 'day'} style={{ transform: `scale(${scale})` }}>
      <div className="prototype-controls" aria-label="Viewport preview"><span className="eyebrow">PREVIEW</span><div className="device-switch"><button className={device === 'console' ? 'active' : ''} onClick={() => setDevice('console')}>Cab console <span className="mono">1440</span></button><button className={device === 'tablet' ? 'active' : ''} onClick={() => setDevice('tablet')}>Tablet <span className="mono">900</span></button><button className={device === 'phone' ? 'active' : ''} onClick={() => setDevice('phone')}>Handheld <span className="mono">430</span></button></div></div>
      <div className="preview-shell" data-theme={nightMode ? 'night' : 'day'}><aside className="app-nav"><div className="brand"><svg width="25.8" height="32" viewBox="45.0 197.74 347.0 430.26" style={{flexShrink:0}}><path d="M 155.72 507.75 C155.40,398.55 155.21,386.72 153.64,379.02 C148.22,352.42 138.20,329.73 122.72,309.04 C110.56,292.78 96.74,280.28 78.59,269.14 C69.67,263.66 48.95,254.00 46.12,254.00 C45.33,254.00 45.00,247.83 45.00,233.13 L 45.00 212.26 L 48.69 211.66 C64.72,209.06 101.33,224.98 127.00,245.72 C138.18,254.76 153.72,271.25 161.26,282.10 C168.27,292.18 178.19,310.58 180.16,317.14 C181.42,321.34 182.41,321.98 183.45,319.25 C184.84,315.63 197.59,295.19 203.26,287.50 C226.91,255.47 258.11,229.94 291.87,215.02 C316.31,204.21 340.93,199.08 372.25,198.26 L 392.00 197.74 L 392.00 215.32 C392.00,241.03 389.56,257.67 382.39,280.82 C370.97,317.72 352.17,348.82 324.52,376.55 C292.03,409.13 253.23,429.48 209.50,436.87 L 199.50 438.57 L 199.24 533.28 L 198.99 628.00 L 156.06 628.00 ZM 220.72 393.91 C254.08,383.10 280.68,365.89 303.26,340.50 C324.61,316.50 339.96,285.41 346.10,253.75 C347.17,248.23 347.79,243.45 347.47,243.14 C346.65,242.32 331.63,245.55 322.39,248.54 C265.29,267.01 212.40,326.69 201.06,385.43 C199.27,394.70 198.57,397.82 199.66,398.69 C200.29,399.18 201.51,398.93 203.47,398.66 C205.93,398.32 213.69,396.18 220.72,393.91 Z" fill="var(--color-bg)"/></svg><span>PRECISION<br/>CAB</span></div><nav>{SCREENS.map(([id, label, Icon]) => <button key={id} title={label} className={screen === id ? 'active' : ''} onClick={() => {setScreen(id); setSheetOpen(false)}}><Icon size={26}/><span>{label}</span></button>)}</nav><div className="nav-footer"><StatusRing state="online"/><span className="mono">RTK</span></div></aside><div className="app-body"><header className="app-header"><div className="header-field"><MapPin size={24}/><strong>Valley Crop Services</strong><ChevronDown size={22}/></div><div className="header-live"><StatusRing state="online" compact/><span className="mono">10:46:32</span><span className="connection"><Radio size={22}/>2.4 GHz</span><button className="mode-toggle" onClick={() => setNightMode((value) => !value)} aria-pressed={nightMode} aria-label={nightMode ? 'Switch to Sunlight Glare day mode' : 'Switch to Dark Cab night mode'}>{nightMode ? <Moon size={22}/> : <Sun size={22}/>}<span>{nightMode ? 'Dark Cab · Night' : 'Sunlight Glare · Day'}</span></button></div></header>{renderScreen()}{screen !== 'sync' && <SyncQueue queue={queue} syncOpen={syncOpen} setSyncOpen={setSyncOpen} docked={docked}/>}</div></div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
