#!/usr/bin/env node
/**
 * Събира всички .gpx файлове от папка gpx/ в data/_3.js (GeoJSON за картата).
 *
 * Употреба (от главната папка на сайта):
 *   node tools/gpx_to_js.js
 *
 * Ако дадена следа е изцяло извън област Варна, тя се пропуска.
 * Имената на файловете могат да съдържат цвят на маркировката, напр.:
 *   Galata-Chernomorets-zelena.gpx  →  Цвят = #2f8f4e
 *   Asparuhovo-chervena.gpx         →  Цвят = #d62828
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gpxDir = path.join(root, 'gpx');
const outFile = path.join(root, 'data', '_3.js');
const boundaryFile = path.join(root, 'data', '_boundary.js');

// Цветове според лентовата маркировка на ТД „Родни балкани“
const MARKING_COLORS = {
  зелена: '#2f8f4e',
  зелен: '#2f8f4e',
  green: '#2f8f4e',
  синя: '#2a6fdb',
  син: '#2a6fdb',
  blue: '#2a6fdb',
  жълта: '#e0b400',
  жълт: '#e0b400',
  yellow: '#e0b400',
  червена: '#d62828',
  червен: '#d62828',
  red: '#d62828'
};

function loadBoundaryRing() {
  const text = fs.readFileSync(boundaryFile, 'utf8');
  const json = JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;$/, ''));
  return json.geometry.coordinates[0];
}

function pointInPolygon(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const p1 = toRad(a[1]);
  const p2 = toRad(b[1]);
  const dp = p2 - p1;
  const dl = toRad(b[0] - a[0]);
  const h =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function simplify(pts, step = 0.00002) {
  if (!pts.length) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const last = out[out.length - 1];
    if (Math.abs(p[0] - last[0]) > step || Math.abs(p[1] - last[1]) > step) {
      out.push(p);
    }
  }
  return out;
}

/** Много опростен GPX parser (trkseg / rte → координати) без външни зависимости */
function parseGpx(xmlText) {
  // махаме namespace, за да е по-лесно с regex
  const flat = xmlText.replace(/\sxmlns(:\w+)?="[^"]*"/g, '');
  const lines = [];

  // trkseg
  const segRe = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let m;
  while ((m = segRe.exec(flat))) {
    const pts = [];
    const ptRe = /<(?:trkpt|rtept)\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*\/?>/gi;
    let p;
    while ((p = ptRe.exec(m[1]))) {
      pts.push([parseFloat(p[2]), parseFloat(p[1])]); // [lon, lat]
    }
    // алтернативен ред: lon преди lat
    if (!pts.length) {
      const ptRe2 = /<(?:trkpt|rtept)\s+[^>]*lon=["']([^"']+)["'][^>]*lat=["']([^"']+)["'][^>]*\/?>/gi;
      while ((p = ptRe2.exec(m[1]))) {
        pts.push([parseFloat(p[1]), parseFloat(p[2])]);
      }
    }
    if (pts.length > 1) lines.push(simplify(pts.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)])));
  }

  // rte (route)
  const rteRe = /<rte>([\s\S]*?)<\/rte>/gi;
  while ((m = rteRe.exec(flat))) {
    const pts = [];
    const ptRe = /<rtept\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*\/?>/gi;
    let p;
    while ((p = ptRe.exec(m[1]))) {
      pts.push([parseFloat(p[2]), parseFloat(p[1])]);
    }
    if (!pts.length) {
      const ptRe2 = /<rtept\s+[^>]*lon=["']([^"']+)["'][^>]*lat=["']([^"']+)["'][^>]*\/?>/gi;
      while ((p = ptRe2.exec(m[1]))) {
        pts.push([parseFloat(p[1]), parseFloat(p[2])]);
      }
    }
    if (pts.length > 1) lines.push(simplify(pts.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)])));
  }

  // име от <trk><name> или <metadata><name>
  let title = null;
  const nameM =
    flat.match(/<trk>\s*[\s\S]*?<name>([^<]+)<\/name>/i) ||
    flat.match(/<metadata>[\s\S]*?<name>([^<]+)<\/name>/i);
  if (nameM) title = nameM[1].trim();

  return { lines, title };
}

function detectMarking(filename, title) {
  const text = ((filename || '') + ' ' + (title || '')).toLowerCase();
  for (const [key, color] of Object.entries(MARKING_COLORS)) {
    if (text.includes(key)) {
      const label =
        key.startsWith('зелен') || key === 'green'
          ? 'Зелена маркировка'
          : key.startsWith('син') || key === 'blue'
            ? 'Синя маркировка'
            : key.startsWith('жълт') || key === 'yellow'
              ? 'Жълта маркировка'
              : 'Червена маркировка';
      return { label, color };
    }
  }
  return { label: null, color: null };
}

function main() {
  if (!fs.existsSync(gpxDir)) {
    console.error('Няма папка gpx/. Създай я и сложи .gpx файлове.');
    process.exit(1);
  }

  const ring = loadBoundaryRing();
  const files = fs
    .readdirSync(gpxDir)
    .filter((f) => f.toLowerCase().endsWith('.gpx'))
    .sort();

  if (!files.length) {
    console.log('Няма .gpx файлове в gpx/. Записвам празна колекция.');
  }

  const feats = [];

  for (const file of files) {
    const full = path.join(gpxDir, file);
    const xml = fs.readFileSync(full, 'utf8');
    const { lines, title: gpxTitle } = parseGpx(xml);

    if (!lines.length) {
      console.log('пропуснат (няма линии):', file);
      continue;
    }

    const sampleOk = lines.some((l) =>
      l.some((p, i) => i % 10 === 0 && pointInPolygon(p[0], p[1], ring))
    );
    if (!sampleOk) {
      console.log('извън област Варна:', file);
      continue;
    }

    const baseName = path.basename(file, path.extname(file));
    const title = gpxTitle || baseName.replace(/[_-]+/g, ' ').trim();
    const marking = detectMarking(baseName, title);

    let lengthKm = 0;
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        lengthKm += haversineKm(line[i], line[i + 1]);
      }
    }

    const props = {
      Име: title,
      Дължина_км: Math.round(lengthKm * 10) / 10,
      Източник: 'GPX'
    };
    if (marking.label) {
      props.Маркировка = marking.label;
      props.Цвят = marking.color;
    }

    feats.push({
      type: 'Feature',
      properties: props,
      geometry: {
        type: 'MultiLineString',
        coordinates: lines
      }
    });
  }

  const collection = {
    type: 'FeatureCollection',
    name: 'Туристически маршрути',
    features: feats
  };

  const out =
    'var json__3 = ' +
    JSON.stringify(collection, null, 0) +
    ';';

  fs.writeFileSync(outFile, out, 'utf8');
  console.log('Записани маршрути:', feats.length, '→', path.relative(root, outFile));
}

main();
