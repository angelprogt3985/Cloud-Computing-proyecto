"""Create/update only the demo dashboard, using existing Google Cloud metrics."""
import json
import os
import subprocess
import urllib.request
from pathlib import Path

PROJECT = 'glacier-quest-1791678996'
COMMON = ['--configuration=glacierquest-creditos', '--account=angelcamargopro2005@gmail.com', '--project=' + PROJECT, '--quiet']
token = subprocess.check_output(['gcloud.cmd' if os.name == 'nt' else 'gcloud', 'auth', 'print-access-token', *COMMON], text=True).strip()
base = 'https://monitoring.googleapis.com/v1/'

def request(path, body=None, method=None):
    req = urllib.request.Request(base + path, method=method,
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Goog-User-Project': PROJECT},
        data=None if body is None else json.dumps(body).encode())
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

desired = json.loads(Path(__file__).with_name('monitoring-dashboard.json').read_text(encoding='utf-8'))
dashboards = request('projects/' + PROJECT + '/dashboards')
matches = [d for d in dashboards.get('dashboards', []) if d.get('displayName') == desired['displayName']]
if dashboards.get('nextPageToken'):
    raise RuntimeError('Paginated listing; inspect dashboards before changing anything')
if len(matches) > 1:
    raise RuntimeError('Multiple matching dashboards; inspect before changing anything')
if matches:
    existing = request(matches[0]['name'])
    desired.update(name=existing['name'], etag=existing['etag'])
    saved = request(existing['name'], desired, 'PATCH')
else:
    saved = request('projects/' + PROJECT + '/dashboards', desired)
verified = request(saved['name'])
assert verified['displayName'] == desired['displayName']
assert len(verified['gridLayout']['widgets']) == len(desired['gridLayout']['widgets'])
print(json.dumps({'status': 'PASS', 'name': saved['name'], 'url': 'https://console.cloud.google.com/monitoring/dashboards/builder/' + saved['name'].split('/')[-1] + '?project=' + PROJECT}, indent=2))
