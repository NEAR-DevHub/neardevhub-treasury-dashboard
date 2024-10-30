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
      background: var(--theme-bg-color) !important;
    `;

const Theme = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: calc(-1 * var(--body-top-padding));
  background: var(--theme-bg-color) !important;

  // remove up/down arrow in input of type = number
  /* For Chrome, Safari, and Edge */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* For Firefox */
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

const Container = styled.div`
  width: 100%;
`;

function AppLayout({ children }) {
  return (
    <ParentContainer>
      <Theme>
        <Container>
          <div className="px-3 py-2">{children}</div>
        </Container>
      </Theme>
    </ParentContainer>
  );
}

return { AppLayout };
