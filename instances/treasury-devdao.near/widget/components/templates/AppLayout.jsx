const data = fetch(`https://httpbin.org/headers`);
const gatewayURL = data?.body?.headers?.Origin ?? "";

// we need fixed positioning for near social and not for org
const ParentContainer = gatewayURL.includes("near.org")
  ? styled.div`
      width: 100%;
    `
  : styled.div`
      position: fixed;
      inset: 73px 0px 0px;
      width: 100%;
      overflow-y: scroll;
    `;

const Theme = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: calc(-1 * var(--body-top-padding));
  background: var(--theme-bg-color);
`;

const Container = styled.div`
  width: 100%;
`;

const AppHeader = ({ page }) => (
  <Widget
    src="${REPL_TREASURY}/widget/components.Navbar"
    props={{
      page: page,
      ...props,
    }}
  />
);

function AppLayout({ page, children }) {
  return (
    <ParentContainer>
      <Theme>
        <Container>
          <AppHeader page={page} />
          <div className="px-3 py-2">{children}</div>
        </Container>
      </Theme>
    </ParentContainer>
  );
}

return { AppLayout };
