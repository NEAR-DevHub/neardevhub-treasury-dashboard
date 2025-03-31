const { Copy } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  Copy: () => <></>,
};

const { label, clipboardText, showLogo, className } = props;

const [isCopied, setIsCopied] = useState(false);

useEffect(() => {
  if (!isCopied) return;

  const timer = setTimeout(() => setIsCopied(false), 2000);

  return () => clearTimeout(timer);
}, [isCopied]);

const Toast = () => {
  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${isCopied ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i
            className="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setIsCopied(false)}
          ></i>
        </div>
        <div className="toast-body justify-self-start">Copied!</div>
      </div>
    </div>
  );
};

return (
  <div>
    {isCopied && <Toast />}
    <div
      className={className}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        clipboard.writeText(clipboardText);
        setIsCopied(true);
      }}
    >
      {showLogo && <Copy />}
      {label}
    </div>
  </div>
);
