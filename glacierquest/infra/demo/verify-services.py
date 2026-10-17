"""Verify the deployed demo's service integrations; remove only this test's player.

Run verify-scheduler.py separately to exercise the authenticated scheduled job.
No secret values or session tokens are included in the report.
"""
import datetime
import json
import os
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT = 'glacier-quest-1791678996'
COMMON = ['--configuration=glacierquest-creditos', '--account=angelcamargopro2005@gmail.com', '--project=' + PROJECT, '--quiet']
BASE = 'https://glacierquest-demo-636305098699.us-central1.run.app'
DATABASE = 'https://' + PROJECT + '-demo.firebaseio.com'
RUNTIME = 'glacierquest-runtime@' + PROJECT + '.iam.gserviceaccount.com'

def gcloud(*args):
    return subprocess.check_output(['gcloud.cmd' if os.name == 'nt' else 'gcloud', *args, *COMMON], text=True).strip()

access = gcloud('auth', 'print-access-token')

def request(url, body=None, bearer=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if bearer:
        headers['Authorization'] = 'Bearer ' + bearer
    if bearer == access:
        headers['X-Goog-User-Project'] = PROJECT
    req = urllib.request.Request(url, method=method, headers=headers,
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            data = r.read()
            return r.status, r.headers, json.loads(data) if 'application/json' in r.headers.get('Content-Type', '') else data
    except urllib.error.HTTPError as e:
        return e.code, e.headers, None

def cloud(url):
    status, _, data = request(url, bearer=access)
    assert status == 200, (url, status)
    return data

def has_role(policy, role, member):
    return any(b['role'] == role and member in b['members'] for b in policy.get('bindings', []))

report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'project': PROJECT, 'checks': {}}
run = json.loads(gcloud('run', 'services', 'describe', 'glacierquest-demo', '--region=us-central1', '--format=json'))
assert any(c['type'] == 'Ready' and c['status'] == 'True' for c in run['status']['conditions'])
report['revision'] = run['status']['latestReadyRevisionName']
template = run['spec']['template']['spec']
assert template['serviceAccountName'] == RUNTIME
container = template['containers'][0]
env = {v['name']: v for v in container['env']}
assert request(BASE)[0] == 200
status, _, health = request(BASE + '/health')
assert status == 200 and health['database'] == 'realtime' and health['accounts'] and not health['ephemeral']
report['checks']['Cloud Run'] = 'PASS: public page, healthy API, persistent database and ready revision'

for variable, name in [('SESSION_SECRET', 'glacierquest-demo-session'), ('DEMO_CODE', 'glacierquest-demo-code')]:
    reference = env[variable]['valueFrom']['secretKeyRef']
    assert reference['name'] == name and reference['key'] == '1'
    root = 'https://secretmanager.googleapis.com/v1/projects/' + PROJECT + '/secrets/' + name
    assert cloud(root + '/versions/1')['state'] == 'ENABLED'
    assert has_role(cloud(root + ':getIamPolicy'), 'roles/secretmanager.secretAccessor', 'serviceAccount:' + RUNTIME)
report['checks']['Secret Manager'] = 'PASS: two enabled versions referenced by Cloud Run; runtime access configured'

builds = cloud('https://cloudbuild.googleapis.com/v1/projects/' + PROJECT + '/locations/us-central1/builds?pageSize=20')
digest = container['image'].split('@')[-1]
matching = [b for b in builds.get('builds', []) if b.get('status') == 'SUCCESS' and any(i.get('digest') == digest for i in b.get('results', {}).get('images', []))]
assert matching, 'No successful build matches the image currently serving traffic'
assert matching[0]['serviceAccount'].endswith('/glacierquest-build@' + PROJECT + '.iam.gserviceaccount.com')
report['build'] = matching[0]['id']
report['checks']['Cloud Build'] = 'PASS: successful build digest matches the deployed image; dedicated builder identity'

bucket = PROJECT + '-demo-assets'
storage_url = 'https://storage.googleapis.com/storage/v1/b/' + bucket
metadata = cloud(storage_url)
assert metadata['iamConfiguration']['publicAccessPrevention'] == 'enforced'
assert has_role(cloud(storage_url + '/iam'), 'roles/storage.objectViewer', 'serviceAccount:' + RUNTIME)
assert request('https://storage.googleapis.com/' + bucket + '/glacier-banner.svg')[0] in (401, 403)
keys = cloud('https://iam.googleapis.com/v1/projects/-/serviceAccounts/' + urllib.parse.quote(RUNTIME, safe='') + '/keys?keyTypes=USER_MANAGED')
assert not keys.get('keys'), 'Runtime has a user-managed key; inspect its purpose'

player_id = None
try:
    code = gcloud('secrets', 'versions', 'access', '1', '--secret=glacierquest-demo-code')
    assert request(BASE + '/api/join', {'name': 'Audit', 'code': 'wrong-code'})[0] == 403
    status, _, session = request(BASE + '/api/join', {'name': 'Verificacion temporal', 'code': code})
    assert status == 201
    player_id = session['player']['id']
    token = session['token']
    assert request(BASE + '/api/me', bearer=token)[0] == 200
    assert request(BASE + '/api/me', bearer=token + 'x')[0] == 401
    assert request(BASE + '/api/asset')[0] == 401
    status, headers, asset = request(BASE + '/api/asset', bearer=token)
    assert status == 200 and headers['X-Asset-Source'] == 'Google Cloud Storage'
    original = request(storage_url + '/o/glacier-banner.svg?alt=media', bearer=access)
    assert original[0] == 200 and asset == original[2]
    report['checks']['Cloud Storage'] = 'PASS: authenticated game asset matches the private bucket object; public read denied'
    assert request(BASE + '/internal/cleanup', {})[0] == 403
    assert request(DATABASE + '/gq_players/' + player_id + '.json')[0] in (401, 403)
    report['checks']['IAM'] = 'PASS: dedicated runtime without downloaded keys, scoped asset/secret access and rejected anonymous access'
finally:
    if player_id:
        for collection in ['gq_players', 'gq_presence']:
            assert request(DATABASE + '/' + collection + '/' + player_id + '.json', bearer=access, method='DELETE')[0] == 200

dashboard = cloud('https://monitoring.googleapis.com/v1/projects/' + PROJECT + '/dashboards')
assert any(d.get('displayName') == 'Glacier Quest - Operacion de la demo' for d in dashboard.get('dashboards', []))
selected = next(d for d in dashboard['dashboards'] if d.get('displayName') == 'Glacier Quest - Operacion de la demo')
end = datetime.datetime.now(datetime.timezone.utc)
start = end - datetime.timedelta(hours=6)
report['metricPoints'] = {}
for widget in selected['gridLayout']['widgets']:
    if 'xyChart' not in widget:
        continue
    query = widget['xyChart']['dataSets'][0]['timeSeriesQuery']['timeSeriesFilter']
    params = {'filter': query['filter'], 'interval.startTime': start.isoformat(), 'interval.endTime': end.isoformat(), 'view': 'FULL', 'pageSize': 1000}
    for k, v in query['aggregation'].items():
        params['aggregation.' + k] = v
    result = cloud('https://monitoring.googleapis.com/v3/projects/' + PROJECT + '/timeSeries?' + urllib.parse.urlencode(params, doseq=True))
    points = sum(len(s.get('points', [])) for s in result.get('timeSeries', []))
    assert points, widget['title'] + ' has no data in the last six hours'
    report['metricPoints'][widget['title']] = points
status, _, logs = request('https://logging.googleapis.com/v2/entries:list', {'resourceNames': ['projects/' + PROJECT], 'filter': 'resource.type="cloud_run_revision" AND resource.labels.revision_name="' + report['revision'] + '" AND jsonPayload.event="request" AND timestamp>="' + start.isoformat() + '"', 'pageSize': 1}, bearer=access)
assert status == 200 and logs.get('entries')
report['checks']['Logging + Monitoring'] = 'PASS: structured logs from current revision and real data in all four dashboard charts'
report['dashboard'] = 'https://console.cloud.google.com/monitoring/dashboards/builder/' + selected['name'].split('/')[-1] + '?project=' + PROJECT

scheduler = cloud('https://cloudscheduler.googleapis.com/v1/projects/' + PROJECT + '/locations/us-central1/jobs/glacierquest-cleanup')
assert scheduler['state'] == 'ENABLED'
assert scheduler['httpTarget']['uri'] == BASE + '/internal/cleanup'
assert scheduler['httpTarget']['oidcToken']['serviceAccountEmail'] == 'glacierquest-cleanup@' + PROJECT + '.iam.gserviceaccount.com'
assert scheduler.get('status', {}).get('code', 0) == 0
report['checks']['Cloud Scheduler'] = 'PASS: enabled, OIDC configured and last reported status successful; run verify-scheduler.py for data effects'
report['status'] = 'PASS'
output = Path(__file__).resolve().parents[3] / 'output' / 'cloud-verification'
output.mkdir(parents=True, exist_ok=True)
(output / 'servicios-verificados.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2, ensure_ascii=False))
