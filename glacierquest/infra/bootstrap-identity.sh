#!/usr/bin/env bash
# Run once in Google Cloud Shell as the project owner. No game resources.
# Stops on any error; inspect existing resources before rerunning a partial setup.
set -euo pipefail
PROJECT='glacier-quest-1791678996'
PROJECT_NUMBER='636305098699'
ACCOUNT='angelcamargopro2005@gmail.com'
BRANCH='codex/preentrega-iam-actions'
REPOSITORY='angelprogt3985/Cloud-Computing-proyecto'
POOL='glacierquest-github'
SA="glacierquest-deploy@${PROJECT}.iam.gserviceaccount.com"
GCLOUD=(gcloud --account="$ACCOUNT" --project="$PROJECT")
actual_number="$("${GCLOUD[@]}" projects describe "$PROJECT" --format='value(projectNumber)')"
[[ "$actual_number" == "$PROJECT_NUMBER" ]] || { echo 'Unexpected project number'; exit 1; }
"${GCLOUD[@]}" iam service-accounts describe "$SA" --format='value(email)'
"${GCLOUD[@]}" services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com
"${GCLOUD[@]}" iam workload-identity-pools create "$POOL" \
  --project="$PROJECT" --location=global --display-name='Glacier Quest GitHub'
"${GCLOUD[@]}" iam workload-identity-pools providers create-oidc github \
  --project="$PROJECT" --location=global --workload-identity-pool="$POOL" \
  --issuer-uri='https://token.actions.githubusercontent.com' \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref' \
  --attribute-condition="assertion.repository_id == '1367518501' && assertion.repository_owner_id == '162619282' && assertion.ref == 'refs/heads/${BRANCH}' && assertion.workflow_ref == '${REPOSITORY}/.github/workflows/verify-cloud-identity.yml@refs/heads/${BRANCH}'"
"${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "$SA" \
  --project="$PROJECT" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository_id/1367518501"
echo 'Federation configured. No game permissions, deployment, storage or database created.'
