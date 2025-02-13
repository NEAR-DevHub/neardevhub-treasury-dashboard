function TransactionLoader({ showInProgress, cancelTxn }) {
  return showInProgress ? (
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast show`}>
        <div class="toast-header px-2">
          <strong class="me-auto">Just Now</strong>
        </div>
        <div class="toast-body">
          <div className="d-flex gap-3">
            <img
              height={30}
              width={30}
              src="https://i.gifer.com/origin/34/34338d26023e5515f6cc8969aa027bca.gif"
            />
            <div className="d-flex flex-column gap-2">
              <div className="flex-1 text-left">
                Awaiting transaction confirmation...
              </div>

              <button
                onClick={cancelTxn}
                className="btn btn-transparent"
                style={{ width: "fit-content" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
return { TransactionLoader };
