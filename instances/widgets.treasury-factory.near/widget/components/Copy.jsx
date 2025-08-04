const { Copy, Check } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  Copy: () => <></>,
  Check: () => <></>,
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
      data-testid="copy-button"
      className={className}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        clipboard.writeText(clipboardText);
        setIsCopied(true);
      }}
    >
      {showLogo && isCopied ? (
        <Check width={logoDimensions?.width} height={logoDimensions?.height} />
      ) : (
        <Copy width={logoDimensions?.width} height={logoDimensions?.height} />
      )}
      {label && isCopied ? "Copied" : label}
    </div>
  </div>
);
