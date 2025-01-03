function TransactionLoader({ showInProgress, showError, toggleToast }) {
  return showInProgress || showError ? (
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showInProgress || showError ? "show" : ""}`}>
        <div class="toast-header px-2">
          <strong class="me-auto">Just Now</strong>
          {showError && (
            <i
              class="bi bi-x-lg h6 mb-0 cursor-pointer"
              onClick={() => toggleToast(false)}
            ></i>
          )}
        </div>
        <div class="toast-body">
          {showInProgress ? (
            <div className="d-flex align-items-center gap-3">
              <img
                height={30}
                width={30}
                src="https://i.gifer.com/origin/34/34338d26023e5515f6cc8969aa027bca.gif"
              />
              <div className="flex-1 text-left">
                Processing your request ...
              </div>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-3 ">
              <i class="bi bi-exclamation-triangle h3 mb-0 warning-icon"></i>
              <div className="flex-1 text-left">
                Something went wrong. Please try resubmitting the request.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;
}
return { TransactionLoader };
