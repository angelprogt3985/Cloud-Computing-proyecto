#!/usr/bin/env bash
# Run once in Google Cloud Shell as the project owner. No game resources.
# Stops on any error; inspect existing resources before rerunning a partial setup.
set -euo pipefail
PROJECT='glacier-quest-1791678996'
PROJECT_NUMBER='636305098699'
POOL='glacierquest-github'
SA="glacierquest-deploy@${PROJECT}.iam.gserviceaccount.com"
actual_number="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
[[ "$actual_number" == "$PROJECT_NUMBER" ]] || { echo 'Unexpected project number'; exit 1; }
gcloud iam service-accounts describe "$SA" --project="$PROJECT" --format='value(email)'
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project="$PROJECT"
gcloud iam workload-identity-pools create "$POOL" \
  --project="$PROJECT" --location=global --display-name='Glacier Quest GitHub'
gcloud iam workload-identity-pools providers create-oidc github \
  --project="$PROJECT" --location=global --workload-identity-pool="$POOL" \
  --issuer-uri='https://token.actions.githubusercontent.com' \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id' \
  --attribute-condition="assertion.repository_id == '1367518501' && assertion.repository_owner_id == '162619282' && assertion.ref == 'refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --project="$PROJECT" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository_id/1367518501"
echo 'Federation configured. No game permissions, deployment, storage or database created.'
