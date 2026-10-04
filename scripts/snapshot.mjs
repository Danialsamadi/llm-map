// Saves the live API output as the fallback snapshot. Usage: node scripts/snapshot.mjs https://llm-3d.<you>.workers.dev
import { writeFileSync } from 'node:fs';

const base = process.argv[2];
if (!base) { console.error('Usage: node scripts/snapshot.mjs <worker-url>'); process.exit(1); }
const r = await fetch(new URL('/api/models', base));
if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
const data = await r.json();
const METRICS = ['intelligence', 'cost', 'price', 'speed', 'agi'];
const rich = data.models.filter(m => METRICS.filter(k => m[k] != null).length >= 3).length;
console.log(`${data.models.length} models, ${rich} with ≥3 metrics, ${data.models.filter(m => m.agi != null).length} with ARC-AGI-2`);
if (rich < 30) throw new Error('Too little data, not overwriting models.json');
writeFileSync(new URL('../public/models.json', import.meta.url), JSON.stringify({ ...data, source: 'snapshot' }));
console.log('Wrote public/models.json');
