NEAR DevHub trustees dashboard BOS components
==============================================

This is the repository of the BOS components for the NEAR DevHub trustees dashboard.

# Contributing

Please refer to [NEAR DevHub](https://github.com/NEAR-DevHub/neardevhub-bos/blob/main/CONTRIBUTING.md) for general contribution guidelines. Details specific for this repository will be added later.

## Running tests

This project has many [playwright-tests](./playwright-tests/), which covers most of the functionality.

Some of the tests depend on the NEAR sandbox. The NEAR sandbox is a local blockchain for testing, and allows simulating the interaction with smart contracts.

To build the sandbox type the following:

`npm run build:sandbox`

Then you can run the tests using `npm run test` or `npm run test:watch:codespaces`. You can also add flags such as `--ui` for UI mode, or inspect the test configuration in [playwright.config.js](./playwright.config.js).

## Creating test videos

Creating videos of your automated tests is a great way of showcasing the changes in your contribution. Video recording of your test can be enabled in the [playwright.config.js](./playwright.config.js) under the `use` section where there is the `video` property that you should set to `on` ( Remember to NOT commit it with the `on` setting, as we don't want to waste github action resources on recording videos).

It might also be smart to add a pause in the end of your test, just to ensure that the last frame is also showing, by adding the following line:

```javascript
await page.waitForTimeout(500);
```

After running the test with video recording on, you should convert it to mp4. This can be easitly done using a command like this:

```bash
ffmpeg -i test-results/stake-delegation-stake-delegation-admin-connected-Should-create-stake-delegation-request-treasury-testing/video.webm stakedelegation.mp4
```

(replace with the paths of the video of the actual test you want to show).

The resulting mp4 file can be directly dragged into the Pull Request description.

# Web4 gateway

In the [web4](./web4) folder there is a setup for a web4 gateway. The [public_html](./web4/public_html/) contains the gateway static index.html file that is served on the web4 page, and there is also the [treasury-web4](./web4/treasury-web4/) that contains the web4 contract that is written in Rust.

## Local development

You can also locally develop the html page served by the web4 gateway. To run a local gateway, type the following:

```bash
npm run gateway:treasury
```

This will create a temporary folder for the static html file, and patch the [web4/public_html/index.html](./web4/public_html/index.html) file with an RPC setting pointing to the local api proxy. If you want to see changes to the html you have to restart the gateway.
