#!/usr/bin/env bash
# Installed by the VPS operator as a root-owned SSH forced command.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/bin
umask 077

fail() { printf 'Deploy: %s\n' "$*" >&2; exit 1; }

[[ $# == 4 ]] || fail 'Expected environment, host port, DB host and DB name.'
environment=$1
host_port=$2
db_host=$3
db_name=$4
case $environment in
  development | staging | production) ;;
  *) fail 'Unknown environment.' ;;
esac
if ! [[ $host_port =~ ^[0-9]{1,5}$ ]] || ! ((10#$host_port >= 1 && 10#$host_port <= 65535)); then
  fail 'Invalid host port.'
fi
host_port=$((10#$host_port))
command_pattern='^deploy (sha256:[0-9a-f]{64})$'
[[ ${SSH_ORIGINAL_COMMAND:-} =~ $command_pattern ]] || fail 'Expected deploy sha256:DIGEST.'
image="ghcr.io/devcaverna/acadflow-api@${BASH_REMATCH[1]}"

config="/etc/acadflow-api/$environment.env"
[[ -f $config && -r $config ]] || fail 'Application environment file is missing.'
mapfile -t configured_hosts < <(sed -n 's/^DB_HOST=//p' "$config")
mapfile -t configured_databases < <(sed -n 's/^DB_DATABASE=//p' "$config")
[[ -n $db_host && -n $db_name &&
  ${#configured_hosts[@]} == 1 && ${configured_hosts[0]} == "$db_host" &&
  ${#configured_databases[@]} == 1 && ${configured_databases[0]} == "$db_name" ]] ||
  fail 'Database target differs from the authorized host and database.'

name="acadflow-api-$environment"
previous="$name-previous"
exec 9> "/run/lock/$name.lock"
flock -n 9 || fail 'Another deploy is in progress.'

exists() { docker container inspect "$1" > /dev/null 2>&1; }
healthy() {
  local status
  status=$(curl --noproxy '*' --silent --max-time 3 --output /dev/null --write-out '%{http_code}' \
    "http://127.0.0.1:$host_port/health") && [[ $status == 200 ]]
}

options=(--env-file "$config" --env NODE_ENV=production --env PORT=3000
  --env "DB_HOST=$db_host" --env "DB_DATABASE=$db_name"
  --user 1000:1000 --cap-drop ALL --security-opt no-new-privileges)
docker pull "$image"

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
