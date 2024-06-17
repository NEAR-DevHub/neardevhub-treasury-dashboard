const page = props.page;

const [showMenu, setShowMenu] = useState(false);

const { href: linkHref } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { logoSrc, navbarLinks } = VM.require(
  "${REPL_TREASURY}/widget/config.data"
) || {
  logoSrc: "",
  navbarLinks: [],
};

const Logo = () => {
  const Wrapper = styled.div`
    @media screen and (max-width: 768px) {
      img {
        width: 90px;
      }
    }
  `;
  return (
    <Wrapper>
      <Link
        to={linkHref({
          widgetSrc: "${REPL_TREASURY}/widget/app",
          params: { page: "dashboard" },
        })}
      >
        <img width={140} src={logoSrc} />
      </Link>
    </Wrapper>
  );
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
  padding: 1.5rem 1rem;
  background-color: var(--theme-color);
  color: var(--text-color);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  @media screen and (max-width: 768px) {
    padding: 1.875rem 1.375rem;
  }
`;

const LinksContainer = styled.div`
  font-size: 17px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;

  @media screen and (max-width: 768px) {
    display: none;
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
  (link ?? "").toLowerCase() === props.page ? "active" : "";

return (
  <Navbar className="position-relative">
    <Logo />
    <div className="d-flex gap-3 align-items-center">
      <LinksContainer>
        {navbarLinks.map((link) => (
          <Link className={isActive(link.title)} href={link.href}>
            {link.title}
          </Link>
        ))}
      </LinksContainer>
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
          {navbarLinks.map((link, idx) => (
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
