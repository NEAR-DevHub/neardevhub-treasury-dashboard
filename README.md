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

## Playwright Video Merger Script

The `playwright-video-merger.sh` script is used to process and combine Playwright test videos into a single, presentation-ready video file. It is especially useful for creating demo or showcase videos from your automated test runs.

### What the Script Does
- **Finds all Playwright test videos** (`video.webm`) in the `test-results/` directory.
- **Overlays the test title** (from `test-title.txt` if available, or the folder name as a fallback) as a subtitle at the bottom of each video.
- **Converts each video to mp4** format for compatibility and better compression.
- **Appends a 1-second freeze frame** (last frame of the test video) to the end of each video segment, making transitions clearer.
- **Concatenates all processed videos** (with freeze frames) into a single output file: `final_output.mp4`.

### How to Use
1. **Run your Playwright tests** with video recording enabled. The test videos will be saved in the `test-results/` directory.
2. **Ensure test titles are saved**: The test suite should write the test title to a `test-title.txt` file in each test's video folder (this is handled by the provided `afterEach` hook in your tests).
3. **Run the script:**
   ```bash
   ./playwright-video-merger.sh
   ```
4. **Find your merged video:** The final output will be saved as `final_output.mp4` in the root of your workspace.

### Notes
- The script also creates intermediate processed videos in the `processed_videos/` directory and freeze frames in the `freeze_frames/` directory.
- If `test-title.txt` is missing, the script will use the folder name as the overlay text.
- You can adjust the text wrapping and overlay style by editing the script variables.

This workflow is ideal for creating clear, annotated demo videos from your Playwright test runs, making it easy to share test results or showcase features.

## Running a Development Server using PlayWright hosted web4 gateway

To start the development server, use the following command:

```bash
npm run dev -- --contractId=webassemblymusic-treasury.near --storageStateFile=devstoragestate.json
```

### Parameters

- `--contractId` (required): Specifies the contract ID to be used. For example, `webassemblymusic-treasury.near`.
- `--treasury` (optional): Specify which treasury to use. Defaults to `<contractId>.sputnik-dao.near`.
- `--storageStateFile` (optional): Path to a Playwright storage state file. If provided, the storage state will be applied to the browser context. This is useful for preloading authentication or other session data.

### Example `devstoragestate.json`

Here is an example of a `devstoragestate.json` file that reflects the data needed for a user to appear logged in:

```json
{
    "cookies": [],
    "origins": [
        {
            "origin": "https://webassemblymusic-treasury.near.page",
            "localStorage": [
                {
                    "name": "near-social-vm:v01::accountId:",
                    "value": "\"petersalomonsen.near\""
                },
                {
                    "name": "near-wallet-selector:contract",
                    "value": "{\"contractId\":\"social.near\",\"methodNames\":[]}"
                },
                {
                    "name": "near-wallet-selector:ledger:accounts",
                    "value": "[{\"accountId\":\"petersalomonsen.near\",\"derivationPath\":\"44'/397'/0'/0'/1'\",\"publicKey\":\"A7sZsyaujEaeYpUsw29hCi8vrxiyxXSbaTqbsxoa4AcN\"}]"
                },
                {
                    "name": "near-wallet-selector:recentlySignedInWallets",
                    "value": "[\"ledger\"]"
                },
                {
                    "name": "near-wallet-selector:rememberRecentWallets",
                    "value": "\"enabled\""
                },
                {
                    "name": "near-wallet-selector:selectedWalletId",
                    "value": "\"ledger\""
                }
            ]
        }
    ],
    "sessionStorage": []
}
```

This file contains `localStorage` entries for user account information and wallet settings, ensuring the user appears logged in when applied. Note that the example here shows how to connect a ledger device, which then ensures that your private credentials are not stored in the browser.

# Web4 gateway

In the [web4](./web4) folder there is a setup for a web4 gateway. The [public_html](./web4/public_html/) contains the gateway static index.html file that is served on the web4 page, and there is also the [treasury-web4](./web4/treasury-web4/) that contains the web4 contract that is written in Rust.

## Local development

You can also locally develop the html page served by the web4 gateway. To run a local gateway, type the following:

```bash
npm run gateway:treasury
```

This will create a temporary folder for the static html file, and patch the [web4/public_html/index.html](./web4/public_html/index.html) file with an RPC setting pointing to the local api proxy. If you want to see changes to the html you have to restart the gateway.
