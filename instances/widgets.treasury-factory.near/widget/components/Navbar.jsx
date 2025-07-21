const page = props.page;
const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID, navbarLinks, logo, isTesting } = VM.require(
  `${instance}/widget/config.data`
);
const [showMenu, setShowMenu] = useState(false);

const { href: linkHref } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const [navbarWithAssetExchange, setNavbarWithAssetExchange] = useState([]);

// we can't update all existing instances to have asset exchange so adding it here for all
useEffect(() => {
  if (Array.isArray(navbarLinks) && !navbarWithAssetExchange?.length) {
    const updatedNavbarLinks = [...(navbarLinks ?? [])];
    const assetExchangeLink = {
      title: "Asset Exchange",
      href: "?page=asset-exchange",
    };

    const settingsIndex = updatedNavbarLinks.findIndex(
      (link) => link.title === "Settings"
    );
    const lockupExists = updatedNavbarLinks.some(
      (link) => link.title === "Lockup"
    );
    const assetExchangeExists = updatedNavbarLinks.some(
      (link) => link.title === "Asset Exchange"
    );

    if (!lockupExists) {
      const lockupLink = { title: "Lockup", href: "?page=lockup" };

      if (settingsIndex !== -1) {
        updatedNavbarLinks.splice(settingsIndex, 0, lockupLink); // Insert before "Settings"
      } else {
        updatedNavbarLinks.push(lockupLink); // Add at the end if "Settings" is missing
      }
    }

    if (!assetExchangeExists) {
      if (settingsIndex !== -1) {
        updatedNavbarLinks.splice(settingsIndex, 0, assetExchangeLink); // Insert before "Settings"
      } else {
        updatedNavbarLinks.push(assetExchangeLink); // Add at the end if "Settings" is missing
      }
    }
    setNavbarWithAssetExchange(updatedNavbarLinks);
  }
}, [navbarLinks]);

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ height: 20, width: 20 }}
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M2 12.2986H14V13.3732H2V12.2986ZM2 9.07471H14V10.1493H2V9.07471ZM2 5.85083H14V6.92546H2V5.85083ZM2 2.62695H14V3.70158H2V2.62695Z"
      fill="#818181"
    />
  </svg>
);

const Navbar = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  color: #1b1b18;
  @media screen and (max-width: 768px) {
    padding: 1.2rem 1rem;
  }

  .account-container {
    color: var(--theme-color) !important;
    font-size: 14px;
    font-weight: 500;
  }

  .text-sm {
    font-size: 13px;
    color: #999999;
  }

  .page-title {
    color: var(--text-color);
  }
`;

const LinksContainer = styled.div`
  font-size: 15px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;
  color: #999999 !important;
  @media screen and (max-width: 768px) {
    display: none;
  }

  a {
    color: var(--text-secondary-color) !important;

    &:hover {
      color: var(--text-color) !important;
    }

    &.active {
      color: var(--text-color) !important;
    }
  }
`;

const MobileMenu = styled.button`
  all: unset;
  display: none;

  @media screen and (max-width: 768px) {
    display: block;
  }
`;

const MobileNav = styled.div`
  display: none;

  @media screen and (max-width: 768px) {
    display: flex;
  }

  position: absolute;
  top: 0;
  right: 0;
  width: auto;
  z-index: 50;
`;

const MobileLink = styled.a`
  font-size: 17px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  margin-bottom: 1rem;
`;

const isActive = (link) =>
  link.toLowerCase().replace(/ /g, "-") === props.page ? "active" : "";

function getTitle(text) {
  return text.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

return (
  <Navbar className="position-relative d-flex justify-content-between gap-2">
    <div className="d-flex flex-column gap-2">
      <div className="d-flex gap-3 align-items-center">
        {/* logo can be svg or src */}
        <Widget
          loading=""
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.MyTreasuries"
          props={{ instance }}
        />

        <div className="d-flex flex-column">
          <div className="h4 mb-0 d-flex flex-row gap-2 align-items-center">
            <div className="page-title">{getTitle(page ?? "dashboard")}</div>
            {isTesting ? (
              <small className="badge">Testing</small>
            ) : (
              <small className="badge">Beta</small>
            )}
          </div>

          <div className="text-sm">
            <span className="text-secondary">Powered by</span>
            <a
              className="primary-text-color fw-semi-bold"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://neartreasury.com/`}
            >
              Near Treasury <i class="bi bi-box-arrow-up-right"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div className="d-flex gap-3 align-items-center">
      <LinksContainer>
        {navbarWithAssetExchange.map((link) => (
          <Link className={isActive(link.title)} href={link.href}>
            {link.title}
          </Link>
        ))}
      </LinksContainer>
      <a className="btn btn-outline-secondary" href={`app?page=${page}`}>
        <i className="bi bi-arrow-repeat h5 mb-0" />
      </a>
      <MobileMenu onClick={() => setShowMenu(!showMenu)}>
        <MenuIcon />
      </MobileMenu>
    </div>
    {showMenu && (
      <MobileNav className="p-3 px-4">
        <div
          onClick={() => setShowMenu(!showMenu)}
          style={{ cursor: "pointer" }}
        >
          <i className="bi bi-x h4"></i>
        </div>
        <div className="d-flex flex-column gap-4 card card-body">
          {(navbarWithAssetExchange ?? []).map((link, idx) => (
            <MobileLink
              className={isActive(link.title) + " mb-0"}
              key={`mobile-link-${idx}`}
              href={link.href}
            >
              {link.title}
            </MobileLink>
          ))}
        </div>
      </MobileNav>
    )}
  </Navbar>
);
