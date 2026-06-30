#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROGRESS = ROOT / 'state' / 'progress.json'
LOG = ROOT / 'logs' / 'heartbeat.jsonl'
STALL_HOURS = 2
DEAD_HOURS = 6

def now():
    return datetime.now(timezone.utc)

def parse_ts(value):
    if not value:
        return None
    return datetime.fromisoformat(value.replace('Z', '+00:00'))

def append(level, event, detail):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    row = {
        'ts': now().isoformat().replace('+00:00', 'Z'),
        'source': 'heartbeat',
        'level': level,
        'event': event,
        'detail': detail,
    }
    with LOG.open('a', encoding='utf-8') as f:
        f.write(json.dumps(row, ensure_ascii=False) + '\n')
    return row

append('info', 'tick', 'alive')
try:
    data = json.loads(PROGRESS.read_text(encoding='utf-8'))
except Exception as exc:
    row = append('error', 'progress_unreadable', repr(exc))
    print(json.dumps(row, ensure_ascii=False))
    raise SystemExit(1)

last_seen = parse_ts(data.get('last_seen'))
stale_count = int(data.get('stale_count') or 0)
alerts = []
if last_seen is None:
    alerts.append(append('error', 'missing_last_seen', 'progress.json has no parseable last_seen'))
else:
    age_hours = (now() - last_seen).total_seconds() / 3600
    if age_hours > DEAD_HOURS:
        alerts.append(append('error', 'dead_loop', f'orchestrator last_seen {age_hours:.2f}h ago'))
    elif age_hours > STALL_HOURS:
        alerts.append(append('warn', 'stale_loop', f'orchestrator last_seen {age_hours:.2f}h ago'))

if stale_count >= 4:
    alerts.append(append('error', 'structurally_stuck', f'stale_count={stale_count}'))
elif stale_count >= 2:
    alerts.append(append('warn', 'stall_detected', f'stale_count={stale_count}'))

# Watchdog pattern: quiet when all is healthy; stdout only on alert.
for row in alerts:
    print(json.dumps(row, ensure_ascii=False))
