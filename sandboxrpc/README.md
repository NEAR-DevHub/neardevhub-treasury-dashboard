# RPC sandbox

The Rust project in this folder sets up a simple near-workspaces-rs instance, deploying the sputnik-dao.near contract and expose it to an RPC endpoint on localhost, which is emitted to stdout when started. This RPC endpoint can be called from JavaScript to experiment with different parameters for calls to the sputnik-dao contract.

You may alter [sandboxrpcplayground.js](./sandboxrpcplayground.js) according to what you want to try out, which is more efficient than testing with real transactions on chain.
