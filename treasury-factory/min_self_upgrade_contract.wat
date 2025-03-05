(module
  (import "env" "predecessor_account_id" (func $predecessor_account_id (param i64)))
  (import "env" "current_account_id" (func $current_account_id (param i64)))
  (import "env" "input" (func $input (param i64)))
  (import "env" "read_register" (func $read_register (param i64 i64)))
  (import "env" "register_len" (func $register_len (param i64) (result i64)))
  (import "env" "promise_batch_create" (func $promise_batch_create (param i64 i64) (result i64)))
  (import "env" "promise_batch_action_deploy_contract" (func $promise_batch_action_deploy_contract (param i64 i64 i64)))
  (import "env" "panic_utf8" (func $panic (param i64 i64))) ;; Import panic function to abort execution

  (func (export "upgrade")
    (local $promise_id i64)
    (local $predecessor_len i64)
    (local $allowed_len i64)
    (local $allowed_addr i32)
    (local $offset i32)

    ;; Read predecessor account id into addr 1024
    (call $predecessor_account_id (i64.const 0))
    (call $read_register (i64.const 0) (i64.const 1024))
    (local.set $predecessor_len (call $register_len (i64.const 0)))

    ;; Get allowed account id length from memory
    (local.set $allowed_len (i64.load (i32.const 0))) ;; Read length stored at address 0
    (local.set $allowed_addr (i32.const 8)) ;; Account string starts at address 8

    ;; Compare lengths first
    (if (i64.ne (local.get $predecessor_len) (local.get $allowed_len))
      (then
        (call $panic (local.get $allowed_len) (i64.const 8)) ;; Abort if lengths differ
      )
    )
  
    ;; Compare contents byte by byte
    (local.set $offset (i32.const 0))
    (loop $compare_loop
      (block $done
        (loop $inner
          (if (i32.ge_u (local.get $offset) (i32.wrap_i64 (local.get $predecessor_len))) 
            (then (br $done)) ;; All bytes matched
          )

          ;; Compare each byte
          (if (i64.ne
                (i64.load8_u (i32.add (i32.const 1024) (local.get $offset))) ;; Read from register
                (i64.load8_u (i32.add (local.get $allowed_addr) (local.get $offset))) ;; Read from memory
              )
            (call $panic (local.get $allowed_len) (i64.const 8)) ;; Abort on mismatch
          )

          (local.set $offset (i32.add (local.get $offset) (i32.const 1)))
          (br $inner)
        )
      )
    )

    ;; Read current account id into addr 1024
    (call $current_account_id (i64.const 0))
    (call $read_register (i64.const 0) (i64.const 1024))

    ;; Create a batch promise for deploying to self
    (call $promise_batch_create (call $register_len (i64.const 0)) (i64.const 1024))
    (local.set $promise_id)

    ;; Read contract binary data from input into addr 2048
    (call $input (i64.const 0))
    (call $read_register (i64.const 0) (i64.const 2048))

    ;; Deploy contract using the input binary data
    (call $promise_batch_action_deploy_contract
      (local.get $promise_id)
      (call $register_len (i64.const 0))
      (i64.const 2048) 
    )
    nop ;; padding
    nop ;; padding
  )
  (memory 32)
  ;; Reserve 64 bytes for the account ID (pre-allocated empty space)
  (data (i32.const 0) "\00\00\00\00\00\00\00\00XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
)
