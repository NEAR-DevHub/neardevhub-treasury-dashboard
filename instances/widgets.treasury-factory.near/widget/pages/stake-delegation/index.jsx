const { tab, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [showStakeRequest, setShowStakeRequest] = useState(false);
const [showUnStakeRequest, setShowUnStakeRequest] = useState(false);
const [showWithdrawRequest, setShowWithdrawRequest] = useState(false);
const createBtnOption = {
  STAKE: "CreateStakeRequest",
  UNSTAKE: "CreateUnstakeRequest",
  WITHDRAW: "CreateWithdrawRequest",
};
const [isCreateBtnOpen, setCreateBtnOpen] = useState(false);
const [selectedCreatePage, setSelectedCreatePage] = useState(
  createBtnOption.STAKE
);

const Container = styled.div`
  .flex-1 {
    flex: 1;
  }
`;

return (
  <Container className="h-100 w-100 flex-grow-1 d-flex flex-column">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.PendingRequests`,
            props: props,
          },
          {
            title: "History",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.History`,
            props: props,
          },
        ],
        SidebarMenu: ({ currentTab }) => (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateButton`}
            props={{
              instance,
              isPendingPage: currentTab.title === "Pending Requests",
            }}
          />
        ),
      }}
    />
  </Container>
);
