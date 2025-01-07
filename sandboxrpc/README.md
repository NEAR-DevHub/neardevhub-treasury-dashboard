# RPC sandbox

The Rust project in this folder sets up a simple near-workspaces-rs instance, deploying the sputnik-dao.near contract and expose it to an RPC endpoint on localhost, which is emitted to stdout when started. This RPC endpoint can be called from JavaScript to experiment with different parameters for calls to the sputnik-dao contract.

In the [playground](./playground/) folder you can find example scripts of how to play with the sandbox.

Before running any of the scripts, make sure that you build the RPC sandbox executable using:

`cargo build`

This should give you the executable [target/debug/sandboxrpc](./target/debug/).
