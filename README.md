NEAR DevHub trustees dashboard BOS components
==============================================

This is the repository of the BOS components for the NEAR DevHub trustees dashboard.

Please refer to [NEAR DevHub](https://github.com/NEAR-DevHub/neardevhub-bos/blob/main/CONTRIBUTING.md) for general contribution guidelines. Details specific for this repository will be added later.

# Developing

The easiest way to get started with development is to open a github codespace from this repository. Once opened you can develop test-driven by typing:

`npm run test:watch:codespaces`

This will open the playwright web console in a new tab, and you can run the tests and see the screen contents.

To build you changes you can either run `npm run build`, or `npm run build:watch` to automatically build when there are changes in the [src](./src) folder.
