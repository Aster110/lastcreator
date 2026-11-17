# Source only in the same trusted CI shell as the Cloudflare command.
set +x
unset CLOUDFLARE_API_TOKEN
if CLOUDFLARE_API_TOKEN="$(gcloud secrets versions access latest --secret=cloudflare-workers-ci-api-token --project=asterapi-staging 2>/dev/null)"; then
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        printf '%s\n' 'GCP Cloudflare credential is empty' >&2
        return 1
    fi
    export CLOUDFLARE_API_TOKEN
else
    unset CLOUDFLARE_API_TOKEN
    printf '%s\n' 'GCP Cloudflare credential unavailable' >&2
    return 1
fi
