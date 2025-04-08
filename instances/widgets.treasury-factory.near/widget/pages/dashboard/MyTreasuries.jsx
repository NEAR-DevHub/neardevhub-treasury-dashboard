const { getCurrentUserTreasuries } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID, navbarLinks, logo, isTesting } = VM.require(
  `${instance}/widget/config.data`
);

const [currentTreasury, setCurrentTreasury] = useState(null);
const [isOpen, setIsOpen] = useState(false);

const accountId = context.accountId;

function parseMetadata(config) {
  return JSON.parse(atob(config.metadata ?? ""));
}

const [userTreasuries, setUserTreasuries] = useState(null);

useEffect(() => {
  if (accountId) {
    getCurrentUserTreasuries(accountId).then((res) => setUserTreasuries(res));
  }
  if (treasuryDaoID) {
    Near.asyncView(treasuryDaoID, "get_config").then((config) => {
      setCurrentTreasury({
        ...config,
        metadata: parseMetadata(config),
      });
    });
  }
}, [treasuryDaoID]);

const defaultImage =
  "https://ipfs.near.social/ipfs/bafkreia5drpo7tfsd7maf4auxkhatp6273sunbg7fthx5mxmvb2mooc5zy";

if (!currentTreasury) {
  return <></>;
}

const treasuryLogo = (currentTreasury.metadata?.flagLogo ?? "")?.includes(
  "ipfs"
)
  ? currentTreasury?.metadata?.flagLogo
  : logo
  ? logo
  : defaultImage;

const Container = styled.div`
  font-size: 14px;
  .image-container {
    position: relative;
  }

  .treasury-dropdown {
  }

  .scroll-box {
    max-height: 300px;
    overflow-y: scroll;
  }

  .custom-dropdown {
    position: absolute;
    background-color: var(--bg-page-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    border-radius: 50%;
    bottom: -1px;
    right: -2px;
    height: 24px;
    width: 24px;
    text-align: center;
  }

  .dropdown-menu {
    width: 400px;
  }
`;

const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

return (
  <Container>
    <div
      className="image-container"
      tabIndex="0"
      onBlur={() => {
        setTimeout(() => {
          setIsOpen(false);
        }, 200);
      }}
    >
      {treasuryLogo && typeof treasuryLogo === "string" ? (
        <img
          src={treasuryLogo}
          width={50}
          height={50}
          className="rounded-3 object-fit-cover"
        />
      ) : (
        treasuryLogo
      )}
      {Array.isArray(userTreasuries) && userTreasuries?.length > 0 && (
        <div className="custom-dropdown" onClick={toggleDropdown}>
          <div className="d-flex justify-content-center align-items-center w-100 h-100">
            <i class="bi bi-chevron-down h6 mb-0 "></i>
          </div>
        </div>
      )}
      {isOpen && (
        <div className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-1 shadow show">
          <div className="scroll-box">
            {userTreasuries.map((option) => {
              return (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${option.instanceAccount}/widget/app`}
                  className={`dropdown-item cursor-pointer w-100 text-wrap d-flex gap-2 align-items-center`}
                >
                  <img
                    src={
                      option.config.metadata?.flagLogo?.includes("ipfs")
                        ? option.config.metadata?.flagLogo
                        : defaultImage
                    }
                    width={35}
                    height={35}
                    className="rounded-3 object-fit-cover"
                  />
                  <div className="d-flex flex-column">
                    <div className="fw-semi-bold">{option.config.name}</div>
                    <div className="text-secondary text-sm">
                      @{option.daoId}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </Container>
);
