#!/usr/bin/env bash
# Executed from the trusted workflow checkout over SSH.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/bin
umask 077

fail() { printf 'Deploy: %s\n' "$*" >&2; exit 1; }

[[ $# == 2 ]] || fail 'Expected an environment and image digest.'
environment=$1
digest=$2
case $environment in
  development | staging | production) ;;
  *) fail 'Unknown environment.' ;;
esac
[[ $digest =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'Expected sha256:DIGEST.'
image="ghcr.io/devcaverna/acadflow-api@$digest"

keys=(API_HOST_PORT CORS_ORIGIN DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_DATABASE DB_SSL
  JWT_SECRET JWT_ACCESS_EXPIRES_IN I18N_FALLBACK_LANGUAGE)
options=(--env NODE_ENV=production --env PORT=3000
  --user 1000:1000 --cap-drop ALL --security-opt no-new-privileges)
for key in "${keys[@]}"; do
  IFS= read -r -d '' -t 10 -n 8193 entry || fail "Missing runtime setting: $key."
  [[ $entry == "$key="* && ${#entry} -lt 8193 ]] || fail "Invalid runtime setting: $key."
  value=${entry#*=}
  [[ -n $value ]] || fail "Empty runtime setting: $key."
  if [[ $key == API_HOST_PORT ]]; then
    host_port=$value
  else
    export "$key=$value"
    options+=(--env "$key")
  fi
done
if ! [[ $host_port =~ ^[0-9]{1,5}$ ]] || ! ((10#$host_port >= 1 && 10#$host_port <= 65535)); then
  fail 'Invalid API_HOST_PORT.'
fi
host_port=$((10#$host_port))
[[ $DB_SSL == true || $DB_SSL == false ]] || fail 'DB_SSL must be true or false.'
if [[ $DB_HOST == host.docker.internal ]]; then
  options+=(--add-host host.docker.internal:host-gateway)
fi
if ! [[ $DB_PORT =~ ^[0-9]{1,5}$ ]] || ! ((10#$DB_PORT >= 1 && 10#$DB_PORT <= 65535)); then
  fail 'Invalid DB_PORT.'
fi
unset entry value
IFS= read -r -d '' -t 10 -n 256 ghcr_username && [[ $ghcr_username =~ ^[a-zA-Z0-9_-]+(\[bot\])?$ ]] ||
  fail 'Missing or invalid GHCR username.'
IFS= read -r -d '' -t 10 -n 8193 ghcr_token && [[ -n $ghcr_token && ${#ghcr_token} -lt 8193 ]] ||
  fail 'Missing or invalid GHCR token.'

name="acadflow-api-$environment"
previous="$name-previous"
exec 9> "/run/lock/$name.lock"
flock -n 9 || fail 'Another deploy is in progress.'
exec 8> "/run/lock/acadflow-api-port-$host_port.lock"
flock -n 8 || fail 'Another deploy is using the requested port.'

for other in development staging production; do
  [[ $other != "$environment" ]] || continue
  for container in "acadflow-api-$other" "acadflow-api-$other-previous"; do
    ports=$(docker container inspect --format \
      '{{range index .HostConfig.PortBindings "3000/tcp"}}{{println .HostPort}}{{end}}' \
      "$container" 2> /dev/null) || continue
    if grep -Fxq "$host_port" <<< "$ports"; then
      fail 'Port is assigned to another AcadFlow environment.'
    fi
  done
done

exists() { docker container inspect "$1" > /dev/null 2>&1; }
healthy() {
  local status
  status=$(curl --noproxy '*' --silent --max-time 3 --output /dev/null --write-out '%{http_code}' \
    "http://127.0.0.1:$host_port/health") && [[ $status == 200 ]]
}

pull_image() (
  registry_config=$(mktemp -d) || exit 1
  trap 'rm -f -- "$registry_config/config.json"; rmdir -- "$registry_config"' EXIT
  # A real auth entry prevents Docker from selecting a host credential helper.
  auth=$(printf '%s:%s' "$ghcr_username" "$ghcr_token" | base64 -w 0) || exit 1
  printf '{"auths":{"ghcr.io":{"auth":"%s"}}}\n' "$auth" > "$registry_config/config.json" || exit 1
  docker --config "$registry_config" pull "$image"
)
if ! pull_image; then
  fail 'GHCR pull failed. Verify that this repository has Actions read access to the package.'
fi
unset ghcr_username ghcr_token

keep_current=false
if exists "$name" && { ! exists "$previous" || healthy; }; then
  keep_current=true
fi

# Run once, in the new image, before changing the existing container.
if ! docker run --rm "${options[@]}" "$image" npm run migration:run:prod; then
  fail 'Migration failed; the running API was not replaced.'
fi

if exists "$name"; then
  if $keep_current; then
    docker stop "$name"
    if exists "$previous"; then docker rm "$previous"; fi
    docker rename "$name" "$previous"
  else
    docker rm -f "$name"
  fi
fi
docker run --detach --restart unless-stopped --name "$name" "${options[@]}" \
  --publish "127.0.0.1:$host_port:3000" "$image"

deadline=$((SECONDS + 120))
while ((SECONDS < deadline)); do
  if healthy; then
    printf 'Healthy: %s (%s)\n' "$name" "$image"
    exit 0
  fi
  sleep 2
done
fail 'Health check failed. Inspect the container and review schema compatibility before rollback.'
