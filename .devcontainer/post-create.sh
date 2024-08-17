#!/bin/bash

npm install
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/mpeterdev/bos-loader/releases/download/v0.7.1/bos-loader-v0.7.1-installer.sh | sh
npx playwright install-deps
npx playwright install

curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh
