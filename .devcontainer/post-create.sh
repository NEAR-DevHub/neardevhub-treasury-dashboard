#!/bin/bash

sudo apt update
sudo apt install pkg-config

npm install
npx playwright install-deps
npx playwright install
