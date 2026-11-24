#!/usr/bin/env bash
set -euo pipefail

export GITHUB_REPOSITORY=DevCaverna/acadflow-api GITHUB_SERVER_URL=https://github.com
temp=$(mktemp -d)
trap 'rm -r -- "$temp"' EXIT
export GITHUB_OUTPUT="$temp/output" GITHUB_STEP_SUMMARY="$temp/summary"
export writes="$temp/writes"
printf -v candidate_commit '%040d' 1
printf -v main_commit '%040d' 2
printf -v digest 'sha256:%064d' 3
candidate="$candidate_commit@$digest"
export candidate_commit main_commit digest candidate

gh() {
  local args="$*" tag_ref='refs/tags/v0.1.0' body
  body=$(jq -cn --arg candidate "$candidate" --arg commit "$main_commit" \
    '{candidate: $candidate, commit: $commit}')
  case $args in
    *"/compare/$main_commit...main"*) printf 'ahead\n' ;;
    *'/actions/workflows/ci.yml/runs '*)
      jq -cn --arg commit "$main_commit" \
        '{workflow_runs: [{head_sha: $commit, conclusion: "success"}]}'
      ;;
    *"/git/commits/$candidate_commit"*) printf 'signed-tree\n' ;;
    *"/git/commits/$main_commit"*) printf '%s\n' "${TARGET_TREE:-signed-tree}" ;;
    *'/git/ref/heads/staging'*) printf '%s\n' "$main_commit" ;;
    *'/deployments/123/statuses'*) printf '[{"state":"success"}]\n' ;;
    *'/deployments '*)
      jq -cn --arg digest "${DEPLOYED_DIGEST:-$digest}" \
        '[{id: 123, creator: {login: "github-actions[bot]"}, payload: {digest: $digest}}]'
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
DEPLOYED_DIGEST=other assert_failure 'No successful staging deployment' \
  "${delivery[@]}" release v0.1.0 "$candidate" "$main_commit"
[[ ! -s $writes ]]
"${delivery[@]}" release v0.1.0 "$candidate" "$main_commit"
diff -u <(printf 'tag\ndraft\npublish\n') "$writes"
: > "$writes"
DRAFT_EXISTS=yes TAG_EXISTS=yes "${delivery[@]}" release v0.1.0 "$candidate" "$main_commit"
diff -u <(printf 'publish\n') "$writes"
PROTECTED=false assert_failure 'Configure production required reviewers' \
  "${delivery[@]}" resolve production v0.1.0
DRAFT=true TAG_EXISTS=yes assert_failure 'Expected a published stable release' \
  "${delivery[@]}" resolve production v0.1.0
TAG_EXISTS=yes "${delivery[@]}" resolve production v0.1.0
SSH_ORIGINAL_COMMAND="deploy $digest extra" assert_failure 'Expected deploy sha256:DIGEST' \
  bash scripts/deploy-api.sh production 3300 db.example acadflow

printf 'Delivery policy tests passed.\n'
