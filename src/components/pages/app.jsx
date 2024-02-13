import {
  REPL_TREASURY_CONTRACT,
  REPL_DEVHUB,
  REPL_PROPOSAL_CONTRACT,
} from "@/includes//common";

const { tab, accountType, ...passProps } = props;

const tabKeys = {
  TRUSTEES: "trustees",
  MODERATORS: "moderators",
};

const councilInfo = Near.view(REPL_TREASURY_CONTRACT, "get_policy");
const [selectedTab, setSelectedTab] = useState(accountType ?? tabKeys.TRUSTEES);
const [isTrustee, setIsTrustee] = useState(false);
const [isModerator, setIsModerator] = useState(false);

if (councilInfo === null) {
  return <></>;
}

if (context.accountId) {
  if (Array.isArray(councilInfo.roles)) {
    councilInfo.roles.map((item) => {
      // trustees or moderators
      if (item.name === tabKeys.TRUSTEES) {
        setIsTrustee(item.kind.Group.includes(context.accountId));
      }
      if (item.name === tabKeys.MODERATORS) {
        setIsModerator(item.kind.Group.includes(context.accountId));
      }
    });
  }
}

const Theme = styled.div`
  position: fixed;
  inset: 73px 0px 0px;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: calc(-1 * var(--body-top-padding));
  background: #f4f4f4;
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const Container = styled.div`
  width: 100%;
  padding-top: 1rem;
  padding-inline: 1.5rem;

  .tab-content {
    min-height: 50vh;
  }

  .bold {
    font-weight: 600;
  }
`;

const Tabs = styled.div`
  border-top: 0.5px solid #b3b3b3;
  .bg-grey {
    background-color: #ececec;
  }
  .cursor {
    cursor: pointer;
  }

  .flex-item {
    flex: 1;
    padding: 1rem;
    font-weight: 600;
    font-size: 18;
  }
`;

const showLoginWindow =
  (selectedTab === tabKeys.TRUSTEES && !isTrustee) ||
  (selectedTab === tabKeys.MODERATORS && !isModerator);

return (
  <Theme>
    <ContentContainer>
      <Container className="pl-5">
        <Widget
          src={`${REPL_TREASURY_CONTRACT}/widget/neardevhub-trustees.components.organism.Navbar`}
          props={{
            ...passProps,
          }}
        />
        <div className="h3 bold">DevDAO Dashboard</div>
        <div className="mt-3">
          {showLoginWindow ? (
            <Widget
              src={`${REPL_TREASURY_CONTRACT}/widget/neardevhub-trustees.components.trustee.Login`}
              props={{ ...passProps, setIsTrustee }}
            />
          ) : (
            <div className="mt-2">
              <Tabs>
                <div className="d-flex w-100 cursor">
                  <div
                    className={
                      "flex-item " +
                      (selectedTab === tabKeys.TRUSTEES ? "" : "bg-grey")
                    }
                    onClick={() => setSelectedTab(tabKeys.TRUSTEES)}
                  >
                    Trustees
                  </div>
                  <div
                    className={
                      "flex-item " +
                      (selectedTab === tabKeys.MODERATORS ? "" : "bg-grey")
                    }
                    onClick={() => setSelectedTab(tabKeys.MODERATORS)}
                  >
                    Moderators
                  </div>
                </div>
                <div className="tab-content">
                  {selectedTab === tabKeys.TRUSTEES ? (
                    <Widget
                      src={`${REPL_TREASURY_CONTRACT}/widget/neardevhub-trustees.components.trustee.Dashboard`}
                      props={{ ...passProps, setIsTrustee, tab }}
                    />
                  ) : (
                    <Widget
                      src={`${REPL_TREASURY_CONTRACT}/widget/neardevhub-trustees.components.moderator.Dashboard`}
                      props={{ ...passProps, setIsTrustee, tab }}
                    />
                  )}
                </div>
              </Tabs>
            </div>
          )}
        </div>
      </Container>
      <Widget
        src={`${REPL_TREASURY_CONTRACT}/widget/neardevhub-trustees.components.organism.Footer`}
        props={{
          ...passProps,
        }}
      />
    </ContentContainer>
  </Theme>
);
