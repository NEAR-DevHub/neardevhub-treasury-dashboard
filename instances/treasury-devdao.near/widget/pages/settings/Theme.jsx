const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

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

const Container = styled.div`
  max-width: 50rem;
  font-size: 14px;

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid var(--border-color);
  }

  .selected-role {
    background-color: var(--grey-04);
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .tag {
    background-color: var(--grey-04);
    font-size: 12px;
    padding-block: 5px;
  }

  label {
    color: rgba(153, 153, 153, 1);
    font-size: 12px;
  }

  .fw-bold {
    font-weight: 500 !important;
  }

  .p-0 {
    padding: 0 !important;
  }

  .text-md {
    font-size: 13px;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    font-weight: 500;
  }

  .text-sm {
    font-size: 12px !important;
  }

  .error-message {
    color: #d95c4a;
    background-color: rgba(217, 92, 74, 0.08);
    font-weight: 500;

    i {
      color: inherit !important;
    }
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
const config = Near.view(treasuryDaoID, "get_config");
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

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

function onSubmitClick() {
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;

  const description = {
    title: "Update Config:  Theme & logo",
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
  setColor(metadata?.primaryColor ?? defaultColor);
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
    <div className="card rounded-3 w-100 h-100 p-3">
      {!metadata ? (
        <div
          className=" d-flex justify-content-center align-items-center w-100 h-100"
          style={{ minHeight: 300 }}
        >
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
          />
        </div>
      ) : (
        <div className="d-flex flex-column gap-4">
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
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ border: "none", width: "100%", paddingInline: 0 }}
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
              }}
            />
          </div>
          <div className="d-flex mt-2 gap-3 justify-content-end">
            <Widget
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
              props={{
                classNames: {
                  root: "btn-outline shadow-none border-0",
                },
                label: "Cancel",
                onClick: setDefault,
              }}
            />

            <Widget
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
              props={{
                classNames: { root: "theme-btn" },
                label: "Save changes",
                onClick: onSubmitClick,
                loading: isTxnCreated,
              }}
            />
          </div>
        </div>
      )}
    </div>
  </Container>
);
