"""Exercise the public demo and class-code gate without printing secrets."""
import json
import subprocess
import urllib.error
import urllib.request
import time

PROJECT = 'glacier-quest-1791678996'
COMMON = ['--configuration=glacierquest-creditos', '--account=angelcamargopro2005@gmail.com', '--project=' + PROJECT, '--quiet']

def gcloud(*args):
    # gcloud.cmd is the official Windows wrapper; arguments are fixed, never secrets.
    import os
    exe = 'gcloud.cmd' if os.name == 'nt' else 'gcloud'
    return subprocess.check_output([exe, *args, *COMMON], text=True).strip()

service = json.loads(gcloud('run', 'services', 'describe', 'glacierquest-demo', '--region=us-central1', '--format=json'))
base = service['status']['url']
code = gcloud('secrets', 'versions', 'access', '1', '--secret=glacierquest-demo-code')

def call(path, body=None, session=None):
    headers = {'Content-Type': 'application/json'}
    if session:
        headers['Authorization'] = 'Bearer ' + session
    req = urllib.request.Request(base + path, headers=headers, data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            payload = response.read()
            return response.status, response.headers, json.loads(payload) if 'application/json' in response.headers.get('Content-Type', '') else payload
    except urllib.error.HTTPError as error:
        return error.code, error.headers, None

assert call('/')[0] == 200, 'Public landing page unavailable'
for path in ['/api/me', '/api/services', '/api/asset']:
    assert call(path)[0] == 401, 'Game endpoint must require a session'
assert call('/api/join', {'name': 'Missing code'})[0] == 403
status, _, health = call('/health')
assert status == 200 and health['cloud'] and health['demo'] and not health['ephemeral']
assert health['database'] == 'realtime'
assert call('/internal/cleanup', {})[0] == 403
assert call('/api/join', {'name': 'Wrong code', 'code': 'incorrect-code'})[0] == 403
status, _, first = call('/api/join', {'name': 'Cloud test A', 'code': code})
assert status == 201
status, _, second = call('/api/join', {'name': 'Cloud test B', 'code': code})
assert status == 201
session = first['token']
status, _, services = call('/api/services', session=session)
assert status == 200
assert any(s['name'] == 'Cloud Storage' and s['status'] == 'Google Cloud Storage' for s in services['services'])
status, headers, asset = call('/api/asset', session=session)
assert status == 200 and headers['X-Asset-Source'] == 'Google Cloud Storage' and b'<svg' in asset
status, _, _ = call('/api/chat', {'body': 'Prueba de integracion cloud'}, session=session)
assert status == 201
time.sleep(0.6)  # Room cache is bounded to half a second.
status, _, room = call('/api/sync', {'x': 320, 'y': 340}, session=second['token'])
assert status == 200 and any(p['id'] == first['player']['id'] for p in room['players'])
assert any(m['body'] == 'Prueba de integracion cloud' for m in room['messages'])
status, _, _ = call('/api/sync', {'x': 240, 'y': 180}, session=session)
assert status == 200
time.sleep(0.6)
status, _, updated_room = call('/api/sync', {'x': 320, 'y': 340}, session=second['token'])
assert status == 200
remote = next(p for p in updated_room['players'] if p['id'] == first['player']['id'])
assert remote['x'] == 240 and remote['y'] == 180, 'Friend position remained stale'
container = service['spec']['template']['spec']['containers'][0]
secret_refs = {e['name']: e.get('valueFrom', {}).get('secretKeyRef') for e in container['env']}
assert secret_refs['SESSION_SECRET']['name'] == 'glacierquest-demo-session'
assert secret_refs['DEMO_CODE']['name'] == 'glacierquest-demo-code'
assert all(secret_refs[k]['key'] == '1' for k in ['SESSION_SECRET', 'DEMO_CODE'])
assert service['spec']['template']['spec']['serviceAccountName'] == 'glacierquest-runtime@' + PROJECT + '.iam.gserviceaccount.com'
database = next(e['value'] for e in container['env'] if e['name'] == 'FIREBASE_DATABASE_URL')
access = gcloud('auth', 'print-access-token')
status, _, collected = call('/api/collect', {'x': 120, 'y': 320, 'itemId': 'c1'}, session=session)
assert status == 200 and collected['player']['coins'] == 3
req = urllib.request.Request(database + '/gq_players/' + first['player']['id'] + '.json', headers={'Authorization': 'Bearer ' + access})
with urllib.request.urlopen(req, timeout=30) as response:
    stored = json.load(response)
assert stored['coins'] == 3 and 'c1' in stored['collected'], 'Game progress not persisted in Firebase'
try:
    urllib.request.urlopen(database + '/gq_players/' + first['player']['id'] + '.json', timeout=30)
    raise AssertionError('Unauthenticated database read was allowed')
except urllib.error.HTTPError as error:
    assert error.code in (401, 403)
print(json.dumps({'status': 'PASS', 'url': base, 'revision': service['status']['latestReadyRevisionName'], 'checks': ['public page without Google credentials', 'game endpoints require session', 'missing and wrong code rejected', 'cloud health', 'secret references', 'two players', 'Storage asset', 'chat', 'presence', 'progress written to real Firebase', 'anonymous database access denied', 'anonymous cleanup denied']}, indent=2))
