#!/bin/zsh
set -eu
cd -- "$(dirname -- "$0")"
if [[ -x /opt/homebrew/opt/node@24/bin/node ]]; then
  export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
fi
exec pnpm local:start --lan
