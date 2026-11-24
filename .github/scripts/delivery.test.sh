#!/usr/bin/env bash
set -euo pipefail

export GITHUB_REPOSITORY=DevCaverna/acadflow-api GITHUB_SERVER_URL=https://github.com
temp=$(mktemp -d)
trap 'rm -r -- "$temp"' EXIT
export GITHUB_OUTPUT="$temp/output" GITHUB_STEP_SUMMARY="$temp/summary"
export writes="$temp/writes"
printf -v candidate_commit '%040d' 1
printf -v main_commit '%040d' 2
printf -v older_commit '%040d' 4
printf -v digest 'sha256:%064d' 3
candidate="$candidate_commit@$digest"
export candidate_commit main_commit older_commit
export fixture_digest="$digest" fixture_candidate="$candidate"

gh() {
  local args="$*" tag_ref='refs/tags/v0.1.0' body
  body=$(jq -cn --arg candidate "$fixture_candidate" --arg commit "$main_commit" \
    '{candidate: $candidate, commit: $commit}')
  case $args in
    *"/compare/$main_commit...main"*) printf 'ahead\n' ;;
    *"/compare/$older_commit...$main_commit"*) printf '%s\n' "${COMPARE_STATUS:-ahead}" ;;
    *'/actions/workflows/ci.yml/runs '*)
      local commit=$main_commit
      if [[ $args == *"head_sha=$older_commit"* ]]; then commit=$older_commit; fi
      jq -cn --arg commit "$commit" --arg result "${CI_RESULT:-success}" \
        '{workflow_runs: [{head_sha: $commit, conclusion: $result}]}'
      ;;
    *"/git/commits/$candidate_commit"*) printf 'signed-tree\n' ;;
    *"/git/commits/$older_commit"*) printf 'other-tree\n' ;;
    *"/git/commits/$main_commit"*) printf '%s\n' "${TARGET_TREE:-signed-tree}" ;;
    *'/git/ref/heads/staging'* | *'/git/ref/heads/develop'*) printf '%s\n' "$main_commit" ;;
    *'/deployments/123/statuses'*) printf '[{"state":"success"}]\n' ;;
    *'/deployments/124/statuses'*) printf '[{"state":"failure"}]\n' ;;
    *'/deployments '*)
      jq -cn --arg digest "${DEPLOYED_DIGEST:-$fixture_digest}" --arg sha "$candidate_commit" \
        --argjson omit "${NO_DEPLOYMENT:-false}" '
          if $omit then [] else
            [124, 123] | map({id: ., sha: $sha, creator: {login: "github-actions[bot]"},
              payload: {digest: $digest}})
          end'
      ;;
    *'/git/matching-refs/tags/v0.1.0')
      if [[ ${TAG_EXISTS:-} == yes ]] || grep -q '^tag$' "$writes"; then
        jq -cn --arg ref "$tag_ref" --arg sha "$main_commit" \
          '[{ref: $ref, object: {sha: $sha, type: "commit"}}]'
      else
        printf '[]\n'
      fi
      ;;
    *'POST '*'/git/refs '*) printf 'tag\n' >> "$writes" ;;
    *'POST '*'/releases '*) printf 'draft\n' >> "$writes"; printf '456\n' ;;
    *'PATCH '*'/releases/456 '*) printf 'publish\n' >> "$writes" ;;
    *'/releases?per_page=100')
      if [[ ${DRAFT_EXISTS:-} == yes ]]; then
        jq -cn --arg body "<!-- acadflow-image: $body -->" \
          '[{id: 456, tag_name: "v0.1.0", body: $body, draft: true, prerelease: false}]'
      else
        printf '[]\n'
      fi
      ;;
    *'/environments/production')
      jq -cn --argjson protected "${PROTECTED:-true}" \
        '{protection_rules: [{type: "required_reviewers", prevent_self_review: $protected, reviewers: [{}]}]}'
      ;;
    *'/releases/tags/v0.1.0')
      jq -cn --arg body "<!-- acadflow-image: $body -->" --argjson draft "${DRAFT:-false}" \
        '{body: $body, draft: $draft, prerelease: false}'
      ;;
    *) printf 'Unexpected API call: %s\n' "$args" >&2; return 1 ;;
  esac
}

cosign() { [[ $1 != "${FAIL_COSIGN:-}" ]]; }
export -f gh cosign

assert_failure() {
  local expected=$1
  shift
  if "$@" > "$temp/error" 2>&1; then
    printf 'Unexpected success: %s\n' "$*" >&2
    exit 1
  fi
  if ! grep -Fq -- "$expected" "$temp/error"; then
    cat "$temp/error" >&2
    exit 1
  fi
}

delivery=(bash .github/scripts/delivery.sh)
touch "$writes"
assert_failure 'Expected COMMIT' "${delivery[@]}" resolve development invalid
if FAIL_COSIGN=verify-attestation "${delivery[@]}" resolve development "$candidate"; then
  printf 'Accepted candidate without a verified SBOM.\n' >&2
  exit 1
fi
"${delivery[@]}" resolve development "$candidate"
grep -Fxq "digest=$digest" "$GITHUB_OUTPUT"
DEPLOYED_DIGEST=other assert_failure 'No successful development deployment' \
  "${delivery[@]}" resolve staging "$candidate"
TARGET_TREE=other assert_failure 'Candidate tree differs from staging' \
  "${delivery[@]}" resolve staging "$candidate"
"${delivery[@]}" resolve staging "$candidate"
NO_DEPLOYMENT=true "${delivery[@]}" snapshot development develop ''
grep -Fxq "revision=$main_commit" "$GITHUB_OUTPUT"
grep -Fxq 'digest=' "$GITHUB_OUTPUT"
"${delivery[@]}" snapshot staging staging ''
grep -Fxq "revision=$candidate_commit" "$GITHUB_OUTPUT"
NO_DEPLOYMENT=true assert_failure 'Deploy to development first' \
  "${delivery[@]}" snapshot staging staging ''
COMPARE_STATUS=diverged assert_failure 'Commit is not in develop' \
  "${delivery[@]}" snapshot development develop "$older_commit"
CI_RESULT=failure assert_failure 'No successful push CI' \
  "${delivery[@]}" snapshot development develop ''
NO_DEPLOYMENT=true "${delivery[@]}" snapshot development develop "$older_commit"
grep -Fxq "revision=$older_commit" "$GITHUB_OUTPUT"
DEPLOYED_DIGEST=other assert_failure 'No successful staging deployment' \
  "${delivery[@]}" release v0.1.0 "$candidate" "$main_commit"
TARGET_TREE=other assert_failure 'No successful staging deployment matches main HEAD' \
  "${delivery[@]}" release v0.1.0 '' "$main_commit"
[[ ! -s $writes ]]
"${delivery[@]}" release v0.1.0 '' "$main_commit"
diff -u <(printf 'tag\ndraft\npublish\n') "$writes"
: > "$writes"
DRAFT_EXISTS=yes TAG_EXISTS=yes "${delivery[@]}" release v0.1.0 '' "$main_commit"
diff -u <(printf 'publish\n') "$writes"
PROTECTED=false assert_failure 'Configure production required reviewers' \
  "${delivery[@]}" resolve production v0.1.0
DRAFT=true TAG_EXISTS=yes assert_failure 'Expected a published stable release' \
  "${delivery[@]}" resolve production v0.1.0
TAG_EXISTS=yes "${delivery[@]}" resolve production v0.1.0
assert_failure 'Expected sha256:DIGEST' bash scripts/deploy-api.sh production "$digest extra"
script=$(< scripts/deploy-api.sh)
printf -v remote_command "bash -c '%s' -- '%s' '%s'" "${script//\'/\'\\\'\'}" production "$digest"
assert_failure 'Missing runtime setting: API_HOST_PORT' sh -c "$remote_command" < /dev/null
assert_failure 'Invalid runtime setting: API_HOST_PORT' \
  sh -c "$remote_command" < <(printf '%s\0' 'PATH=/tmp')
runtime=('CORS_ORIGIN=https://app.example.com' 'DB_HOST=db.example.com'
  'DB_PORT=5432' 'DB_USERNAME=app' 'DB_PASSWORD=not-real' 'DB_DATABASE=acadflow'
  'DB_SSL=true' 'JWT_SECRET=not-real' 'JWT_ACCESS_EXPIRES_IN=15m' 'I18N_FALLBACK_LANGUAGE=pt-BR')
r2=('R2_ENDPOINT=https://example.r2.cloudflarestorage.com' 'R2_BUCKET_NAME=private-test'
  'R2_ACCESS_KEY_ID=not-real' 'R2_SECRET_ACCESS_KEY=not-real')
assert_failure 'Invalid API_HOST_PORT' \
  sh -c "$remote_command" < <(printf '%s\0' 'API_HOST_PORT=65536' "${runtime[@]}" 'R2_ENABLED=false')
assert_failure 'R2_ENABLED must be true or false' \
  sh -c "$remote_command" < <(printf '%s\0' 'API_HOST_PORT=3300' "${runtime[@]}" 'R2_ENABLED=yes')
assert_failure 'Missing runtime setting: R2_ENDPOINT' \
  sh -c "$remote_command" < <(printf '%s\0' 'API_HOST_PORT=3300' "${runtime[@]}" 'R2_ENABLED=true')
assert_failure 'Empty runtime setting: R2_SECRET_ACCESS_KEY' \
  sh -c "$remote_command" < <(printf '%s\0' 'API_HOST_PORT=3300' "${runtime[@]}" \
    'R2_ENABLED=true' "${r2[@]:0:3}" 'R2_SECRET_ACCESS_KEY=')
assert_failure 'Missing or invalid GHCR token' \
  sh -c "$remote_command" < <(printf '%s\0' 'API_HOST_PORT=3300' "${runtime[@]}" \
    'R2_ENABLED=false' 'github-actions[bot]')
assert_failure 'Missing or invalid GHCR token' \
  sh -c "$remote_command" < <(printf '%s\0' 'API_HOST_PORT=3300' "${runtime[@]}" \
    'R2_ENABLED=true' "${r2[@]}" 'github-actions[bot]')

printf 'Delivery policy tests passed.\n'
