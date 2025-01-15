const { encodeToMarkdown, hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  encodeToMarkdown: () => {},
  hasPermission: () => {},
};

const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID, themeColor } = VM.require(
  `${instance}/widget/config.data`
);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "config",
  "AddProposal"
);

const ThemeOptions = [
  {
    label: "Light",
    value: "light",
  },
  {
    label: "Dark",
    value: "dark",
  },
];

const defaultColor = "#0000";
const defaultImage =
  "https://github.com/user-attachments/assets/244e15fc-3fb7-4067-a2c3-013e189e8d20";
const [image, setImage] = useState(defaultImage);
const [color, setColor] = useState(defaultColor);
const [selectedTheme, setSelectedTheme] = useState(ThemeOptions[0]);
const [error, setError] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [showToastStatus, setToastStatus] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);

const Container = styled.div`
  max-width: 50rem;
  font-size: 14px;

  label {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .error-message {
    color: #d95c4a;
    background-color: rgba(217, 92, 74, 0.08);
    font-weight: 500;

    i {
      color: inherit !important;
    }
  }

  .form-control:disabled {
    background-color: transparent !important;
  }

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid var(--border-color);
  }
`;

function uploadImageToServer(file) {
  asyncFetch("https://ipfs.near.social/add", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: file,
  })
    .catch((e) => {
      setError("Error occured while uploading image, please try again.");
      console.error("Upload error:", e);
    })
    .then((res) => {
      console.log(e);
      setImage(`https://ipfs.near.social/ipfs/${res.body.cid}`);
    });
}

const daoPolicy = Near.view(treasuryDaoID, "get_policy");
const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = JSON.parse(atob(config.metadata ?? ""));
const isDarkTheme = metadata?.theme === "dark";
const code = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload Logo</title>
  <style>
    body {
      --bg-page-color: ${isDarkTheme ? "#222222" : "#FFFFFF"};
      --text-color: ${isDarkTheme ? "#CACACA" : "#1B1B18"};
      --border-color: ${isDarkTheme ? "#3B3B3B" : "rgba(226, 230, 236, 1)"};
      --text-secondary-color: ${isDarkTheme ? "#878787" : "#999999"};
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif;
      background-color: var(--bg-page-color);
      color: var(--text-color);
    }
    .upload-btn {
     
      display: inline-block;
      padding: 10px 20px;
      font-size: 16px;
      color: var(--text-color);
      background-color: transparent;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
    }
    .upload-btn:hover {
      background-color: inherit;
    }
    .btn-container {
      width:200px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .text-muted {
      color: var(--text-secondary-color);
      font-size: 12px;
    }
    .text-center{
      text-align:center;
    }
  </style>
</head>
<body>
    <div class="btn-container">
      <button class="upload-btn" id="uploadButton">Upload Logo</button>
      <div class="text-muted text-center">SVG, PNG, or JPG (256x256 px)</div>
      <input
        type="file"
        id="imageUpload"
        accept="image/png, image/jpeg, image/svg+xml"
        style="display: none;"
      />
  </div>

  <script>
    const imageUpload = document.getElementById("imageUpload");
    const uploadButton = document.getElementById("uploadButton");

    imageUpload.disabled = ${!hasCreatePermission}
    uploadButton.disabled = ${!hasCreatePermission}
    // Trigger the file input when the button is clicked
    uploadButton.addEventListener("click", () => {
      imageUpload.click();
    });

    // Handle image upload
    imageUpload.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();

        reader.onload = () => {
          const img = new Image();
          img.src = reader.result;

          img.onload = async () => {
            // Check dimensions
            if (img.width === 256 && img.height === 256) {
              window.parent.postMessage(
                { handler: "uploadImage", file: file },
                "*"
              );
            } else {
              window.parent.postMessage(
                {
                  handler: "error",
                  error:
                    "Invalid logo. Please upload a PNG, JPG, or SVG file for your logo that is exactly 256x256 px",
                },
                "*"
              );
            }
          };
        };

        reader.onerror = (error) => {
          console.error("Error reading file:", error);
        };

        reader.readAsDataURL(file);
      }
    });


  </script>
</body>
</html>
`;

const SubmitToast = () => {
  return (
    showToastStatus && (
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className={`toast ${showToastStatus ? "show" : ""}`}>
          <div className="toast-header px-2">
            <strong className="me-auto">Just Now</strong>
            <i
              className="bi bi-x-lg h6 mb-0 cursor-pointer"
              onClick={() => setToastStatus(null)}
            ></i>
          </div>
          <div className="toast-body">
            <div className="d-flex align-items-center gap-3">
              <i class="bi bi-check2 h3 mb-0 success-icon"></i>
              <div>
                <div>Theme change request submitted.</div>
                <a
                  href={href({
                    widgetSrc: `${instance}/widget/app`,
                    params: {
                      page: "settings",
                    },
                  })}
                >
                  View it
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
}, []);

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;
    let errorTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          setToastStatus(true);
          setTxnCreated(false);
          clearTimeout(errorTimeout);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    // if in 20 seconds there is no change, show error condition
    errorTimeout = setTimeout(() => {
      setShowErrorToast(true);
      setTxnCreated(false);
      clearTimeout(checkTxnTimeout);
    }, 20000);

    return () => {
      clearTimeout(checkTxnTimeout);
      clearTimeout(errorTimeout);
    };
  }
}, [isTxnCreated]);

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

function onSubmitClick() {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;

  const description = {
    title: "Update Config - Theme & logo",
  };
  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: {
            ChangeConfig: {
              config: {
                name: config.name,
                purpose: config.purpose,
                metadata: toBase64({
                  ...metadata,
                  primaryColor: color,
                  flagLogo: image,
                  theme: selectedTheme.value,
                }),
              },
            },
          },
        },
      },
      gas: 200000000000000,
    },
  ]);
}

function setDefault() {
  setImage(metadata?.flagLogo ?? defaultImage);
  setColor(metadata?.primaryColor ?? themeColor ?? defaultColor);
  setSelectedTheme(
    ThemeOptions.find((i) => i.value === metadata?.theme) ?? ThemeOptions[0]
  );
}

useEffect(() => {
  if (metadata) {
    setDefault();
  }
}, [metadata]);

return (
  <Container>
    <SubmitToast />
    <TransactionLoader
      showInProgress={isTxnCreated}
      showError={showErrorToast}
      toggleToast={() => setShowErrorToast(false)}
    />
    <div className="card rounded-4 w-100 h-100 py-3">
      <div className="card-title px-3 pb-3">Theme & Logo</div>
      {!metadata ? (
        <div
          className="d-flex justify-content-center align-items-center w-100 h-100"
          style={{ minHeight: 300 }}
        >
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
          />
        </div>
      ) : (
        <div className="d-flex flex-column gap-4 px-3 py-1">
          <div class="d-flex gap-2 align-items-center flex-wrap flex-md-nowrap">
            <img
              src={image ? image : defaultImage}
              height={100}
              width={100}
              className="object-cover rounded-3"
            />
            <iframe
              srcDoc={code}
              style={{
                height: "110px",
                width: "100%",
                backgroundColor: "var(--bg-page-color)",
              }}
              onMessage={(e) => {
                switch (e.handler) {
                  case "uploadImage": {
                    setError(null);
                    uploadImageToServer(e.file);
                  }
                  case "error": {
                    setError(e.error);
                  }
                }
              }}
            />
          </div>
          {error && (
            <div class="error-message p-3 rounded-3 d-flex gap-2 align-items-center">
              <i class="bi bi-exclamation-octagon h4 mb-0"></i>
              {error}
            </div>
          )}
          <div className="d-flex flex-column gap-1">
            <label>Primary color</label>
            <div className="d-flex border border-1 align-items-center rounded-3 gap-2 p-1 px-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: 35,
                  height: 30,
                  border: "none",
                  borderRadius: 5,
                  appearance: "none",
                  padding: 0,
                }}
                disabled={!hasCreatePermission}
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ border: "none", width: "100%", paddingInline: 0 }}
                disabled={!hasCreatePermission}
              />
            </div>
          </div>
          <div className="d-flex flex-column gap-1">
            <label>Theme</label>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDown`}
              props={{
                options: ThemeOptions,
                selectedValue: selectedTheme ?? ThemeOptions[0],
                onUpdate: setSelectedTheme,
                disabled: !hasCreatePermission,
              }}
            />
          </div>
          <div className="d-flex mt-2 gap-3 justify-content-end">
            <Widget
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
              props={{
                classNames: {
                  root: "btn btn-outline-secondary shadow-none no-transparent",
                },
                label: "Cancel",
                onClick: setDefault,
                disabled: !hasCreatePermission,
              }}
            />
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
              props={{
                ActionButton: () => (
                  <Widget
                    src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                    props={{
                      classNames: { root: "theme-btn" },
                      label: "Submit Request",
                      loading: isTxnCreated,
                      disabled: !hasCreatePermission || error || isTxnCreated,
                    }}
                  />
                ),
                checkForDeposit: true,
                treasuryDaoID,
                disabled: !hasCreatePermission || error || isTxnCreated,
                callbackAction: onSubmitClick,
              }}
            />
          </div>
        </div>
      )}
    </div>
  </Container>
);
