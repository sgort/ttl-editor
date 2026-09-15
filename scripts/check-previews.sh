#!/usr/bin/env bash
#
# check-previews.sh — does every preview environment still belong to an open
# pull request?
#
# Each deploy workflow builds a preview environment for a pull request, and
# close-preview-environments.yml deletes it when the pull request closes. That
# workflow cannot catch everything. GitHub does not run pull_request workflows
# while a pull request has a merge conflict, closing included, so a stale pull
# request that closes that way leaves its preview running. In September 2026
# ACC held four orphaned previews -- #43, #45 and #123 from exactly that, #66
# from the path filter that workflow replaced -- and PROD another four, too old
# to trace. All were public URLs serving old code, each holding one of the ten
# slots a Standard plan allows. Nothing reported them; they were found by
# looking at the portal.
#
# So this checks from the other end: list the environments Azure actually has,
# compare them with the pull requests GitHub has open, and name every orphan.
#
# Like check-mirror.sh it runs on a workstation -- it needs an Azure login that
# a runner does not have -- and it is called at each release from
# .claude/commands/bump-release.md. And like check-mirror.sh it never deletes.
# It prints the exact command and stops: deleting an Azure resource is a
# human's decision.
#
# Apps are found from the deploy workflows' own file names,
# azure-static-web-apps-<hostname>.yml, so nothing here names a subscription,
# resource group or app.
#
# Exit 0 when every preview belongs to an open pull request. Exit 1 on any
# orphan, and whenever something could not be checked -- a missing tool, no
# Azure login, a workflow whose app cannot be found. Modelled on
# check-mirror.sh, including its rule that anything unchecked is reported
# rather than passed over in silence.
#
# Usage:
#   bash scripts/check-previews.sh
#   npm run check-previews
#
#   OPEN_PRS="148 149" bash scripts/check-previews.sh
#       Treat only these pull requests as open instead of asking GitHub. For
#       exercising the orphan path without closing a real pull request.

set -euo pipefail

WORKFLOW_DIR=".github/workflows"

for tool in az gh; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "check-previews: '$tool' is not installed. Nothing was compared." >&2
    exit 1
  fi
done

if ! az account show >/dev/null 2>&1; then
  echo "check-previews: not logged in to Azure (run az login). Nothing was compared." >&2
  exit 1
fi

if [ -n "${OPEN_PRS+x}" ]; then
  open_prs=" ${OPEN_PRS} "
  echo "check-previews: OPEN_PRS is set — treating only these as open:${open_prs}"
else
  if ! prs=$(gh pr list --state open --limit 500 --json number --jq '.[].number' 2>/dev/null); then
    echo "check-previews: cannot list open pull requests (check gh auth status). Nothing was compared." >&2
    exit 1
  fi
  open_prs=" $(printf '%s' "$prs" | tr '\n' ' ') "
fi

shopt -s nullglob
workflows=("$WORKFLOW_DIR"/azure-static-web-apps-*.yml)
if [ "${#workflows[@]}" -eq 0 ]; then
  echo "check-previews: no $WORKFLOW_DIR/azure-static-web-apps-*.yml found. Nothing was compared." >&2
  exit 1
fi

echo "check-previews: preview environments against open pull requests"
echo

orphans=0
unchecked=0

for wf in "${workflows[@]}"; do
  stem=$(basename "$wf" .yml)
  stem=${stem#azure-static-web-apps-}
  label=$(sed -n 's/^name:[[:space:]]*//p' "$wf" | head -1)
  label=${label:-$stem}

  # The default hostname starts with the stem the workflow file is named after:
  # orange-beach-0574c2a03.3.azurestaticapps.net.
  app=$(az staticwebapp list \
    --query "[?starts_with(defaultHostname, '${stem}.')].[name, resourceGroup]" \
    -o tsv 2>/dev/null | head -1 || true)
  if [ -z "$app" ]; then
    printf '  %s: no Static Web App with hostname %s.* in the current subscription\n' "$label" "$stem"
    unchecked=$((unchecked + 1))
    continue
  fi
  name=$(printf '%s' "$app" | cut -f1)
  rg=$(printf '%s' "$app" | cut -f2)

  if ! envs=$(az staticwebapp environment list -n "$name" -g "$rg" \
    --query "[?name!='default'].[name, sourceBranch]" -o tsv 2>/dev/null); then
    printf '  %s: cannot list environments of %s\n' "$label" "$name"
    unchecked=$((unchecked + 1))
    continue
  fi

  printf '  %s — %s (%s)\n' "$label" "$name" "$rg"
  if [ -z "$envs" ]; then
    printf '    no preview environments\n'
    continue
  fi

  while IFS=$'\t' read -r env branch; do
    if ! [[ "$env" =~ ^[0-9]+$ ]]; then
      # Named after a branch rather than a pull request number. Nothing here
      # creates one, so it is reported and left alone.
      printf '    %-6s branch environment (%s) — not a pull request, left alone\n' "$env" "$branch"
    elif [[ "$open_prs" == *" $env "* ]]; then
      printf '    #%-5s open     %s\n' "$env" "$branch"
    else
      printf '    #%-5s ORPHAN   %s — pull request #%s is not open\n' "$env" "$branch" "$env"
      printf '           az staticwebapp environment delete -n %s -g %s --environment-name %s --yes\n' \
        "$name" "$rg" "$env"
      orphans=$((orphans + 1))
    fi
  done <<<"$envs"
done

echo
if [ "$unchecked" -gt 0 ]; then
  echo "check-previews: $unchecked deploy workflow(s) could not be checked — see above." >&2
fi

if [ "$orphans" -gt 0 ]; then
  echo "$orphans orphaned preview environment(s): each still serves a public URL and"
  echo "holds a slot. Run the command(s) above, then run this check again."
  exit 1
fi

if [ "$unchecked" -gt 0 ]; then
  exit 1
fi

echo "OK — every preview environment belongs to an open pull request."
