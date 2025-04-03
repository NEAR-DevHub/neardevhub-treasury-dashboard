const { Copy } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  Copy: () => <></>,
};

const { label, clipboardText, showLogo, className, logoDimensions } = props;

const [isCopied, setIsCopied] = useState(false);

useEffect(() => {
  if (!isCopied) return;

  const timer = setTimeout(() => setIsCopied(false), 2000);

  return () => clearTimeout(timer);
}, [isCopied]);

return (
  <div>
    <div
      className={className}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        clipboard.writeText(clipboardText);
        setIsCopied(true);
      }}
    >
      {showLogo && isCopied ? (
        <i class="bi bi-check-lg h5 mb-0"></i>
      ) : (
        <Copy width={logoDimensions?.width} height={logoDimensions?.height} />
      )}
      {label && isCopied ? "Copied" : label}
    </div>
  </div>
);
