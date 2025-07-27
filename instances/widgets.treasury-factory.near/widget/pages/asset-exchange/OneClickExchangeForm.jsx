const { instance, onCancel, onSubmit } = props;

return (
  <div className="one-click-exchange-form">
    <h5 className="mb-3">1Click Cross-Network Swap</h5>
    
    <div className="alert alert-info" role="alert">
      <i className="bi bi-info-circle me-2"></i>
      <strong>Coming Soon!</strong> 1Click API integration for cross-network swaps via NEAR Intents.
    </div>
    
    <div className="placeholder-content text-center py-5">
      <i className="bi bi-arrow-left-right h1 text-muted"></i>
      <p className="text-muted mt-3">
        This feature will enable cross-network token swaps using the 1Click API.
        <br />
        Swap tokens from NEAR to other blockchains seamlessly through NEAR Intents.
      </p>
    </div>
    
    <div className="d-flex justify-content-end gap-2 mt-4">
      <button className="btn btn-outline-secondary" onClick={onCancel}>
        Cancel
      </button>
      <button className="btn btn-primary" disabled>
        Submit
      </button>
    </div>
  </div>
);