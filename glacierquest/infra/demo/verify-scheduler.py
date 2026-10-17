"""Seed disposable fixtures and verify a real Scheduler -> Run -> Firebase execution."""
import json
import os
import subprocess
import time
import urllib.request
import uuid

PROJECT = 'glacier-quest-1791678996'
COMMON = ['--configuration=glacierquest-creditos', '--account=angelcamargopro2005@gmail.com', '--project=' + PROJECT, '--quiet']

def gcloud(*args):
    return subprocess.check_output(['gcloud.cmd' if os.name == 'nt' else 'gcloud', *args, *COMMON], text=True).strip()

access = gcloud('auth', 'print-access-token')
base = 'https://glacier-quest-1791678996-demo.firebaseio.com/'
prefix = 'scheduler-test-' + uuid.uuid4().hex
paths = [f'gq_presence/{prefix}-old', f'gq_chat/{prefix}-old', f'gq_presence/{prefix}-fresh', f'gq_players/{prefix}']

def request(path, method='GET', value=None):
    req = urllib.request.Request(base + path + '.json', method=method,
        headers={'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json'},
        data=json.dumps(value).encode() if method == 'PUT' else None)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

try:
    request(paths[0], 'PUT', {'id': prefix, 'name': 'Disposable cleanup test', 'seenAt': 1})
    request(paths[1], 'PUT', {'id': prefix, 'body': 'Disposable cleanup test', 'createdAt': 1})
    # Initial Scheduler provisioning can take minutes. Keep this synthetic fixture fresh throughout.
    request(paths[2], 'PUT', {'id': prefix, 'name': 'Disposable fresh test', 'seenAt': int(time.time() * 1000) + 3600000})
    request(paths[3], 'PUT', {'id': prefix, 'name': 'Disposable progress test', 'coins': 7})
    gcloud('scheduler', 'jobs', 'run', 'glacierquest-cleanup', '--location=us-central1')
    deadline = time.monotonic() + 90
    while True:
        if request(paths[0]) is None and request(paths[1]) is None:
            break
        if time.monotonic() >= deadline:
            raise AssertionError('Scheduler did not clean the expired fixtures within 90 seconds')
        time.sleep(3)
    assert request(paths[2]) is not None, 'Fresh presence was removed'
    assert request(paths[3])['coins'] == 7, 'Player progress was modified'
    print(json.dumps({'status': 'PASS', 'checks': ['real scheduled OIDC invocation', 'expired presence removed', 'old chat removed', 'fresh presence preserved', 'player progress preserved']}, indent=2))
finally:
    # Only IDs created above by this invocation; never sweep application collections.
    for path in paths:
        request(path, 'DELETE')
