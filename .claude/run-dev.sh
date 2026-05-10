#!/bin/sh
export PATH="/Users/sven.wiegand/.nvm/versions/node/v24.15.0/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
exec npm run dev
