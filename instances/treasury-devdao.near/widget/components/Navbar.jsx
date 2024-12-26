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
    font-weight: 700;
  }

  .text-sm {
    font-size: 13px;
    color: #999999;
  }
`;

const LinksContainer = styled.div`
  font-size: 17px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;
  color: #999999 !important;
  @media screen and (max-width: 768px) {
    display: none;
  }

  a {
    color: inherit !important;

    &:hover {
      color: #1b1b18 !important;
    }

    &.active {
      color: #1b1b18 !important;
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
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
  flex-shrink: 0;

  border-radius: 0px 0px 0px 16px;
  background: rgba(41, 41, 41, 0.6);
  backdrop-filter: blur(5px);

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
      <div className="d-flex gap-2 align-items-center">
        {logo && logo}
        <div className="h3 mb-0">{getTitle(page ?? "dashboard")}</div>
        {isTesting && <div>(Testing)</div>}
      </div>
      <div>
        <span className="text-sm">Treasury Wallet: </span>
        <span className="account-container">{treasuryDaoID}</span>
      </div>
    </div>
    <div className="d-flex gap-3 align-items-center">
      <LinksContainer>
        {(navbarLinks ?? []).map((link) => (
          <Link className={isActive(link.title)} href={link.href}>
            {link.title}
          </Link>
        ))}
      </LinksContainer>
      <a
        className="card card-body py-1 px-2 rounded-3"
        href={`app?page=${page}`}
      >
        <i className="bi bi-arrow-repeat h4 mb-0 text-black" />
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
        <div className="d-flex flex-column gap-2">
          {(navbarLinks ?? []).map((link, idx) => (
            <MobileLink
              className={isActive(link.title)}
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
