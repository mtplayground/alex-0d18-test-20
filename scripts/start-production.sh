#!/usr/bin/env sh
set -eu

npm run deploy:migrate
exec npm start
