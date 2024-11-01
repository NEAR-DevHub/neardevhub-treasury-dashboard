const { getNearBalances } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
);

const baseUrl = "https://api.pikespeak.ai";
const [balance, setBalance] = useState(null);
const REQUIRED_BALANCE = 12;

const getBalance = () => {
  const balance = getNearBalances(context.accountId);
  setBalance(parseFloat(balance.availableParsed));
};

getBalance();

const Section = styled.div`
  ul {
    margin: 0;
    padding: 0;

    li {
      list-style: none;
      padding: 8px 0;
      border-bottom: 1px solid #e2e6ec;

      &:last-child {
        border: 0;
      }
    }
  }
`;

const SummaryListItem = ({ title, value, info }) => (
  <li className="d-flex align-items-center justify-content-between w-100">
    <div>
      {title}
      {info && (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tooltip">{info}</Tooltip>}
        >
          <i className="mx-1 bi bi-info-circle text-secondary" />
        </OverlayTrigger>
      )}
    </div>
    {value} NEAR
  </li>
);

return (
  <>
    <Section>
      <h3>Confirm your wallet</h3>
      <p>
        This is the account that will be used to pay for creating the treasury
        and managing it at first. You'll need to have enough funds in this
        wallet to cover the setup costs.
      </p>
    </Section>
    <Section className="d-flex flex-column gap-3">
      <h4>Connected Wallet</h4>
      <Widget
        src="mob.near/widget/Profile.ShortInlineBlock"
        props={{
          accountId: context.accountId,
        }}
      />
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "info",
          text: "This is your personal NEAR Wallet, not the treasury wallet",
        }}
      />
      <div className="mt-3">
        <h4>Estimated one-time costs:</h4>
        <ul>
          <SummaryListItem
            title="SputnikDAO"
            value={6}
            info="Estimated one-time costs to store info in SputnikDAO"
          />
          <SummaryListItem
            title="Frontend BOS Widget Hosting"
            value={6}
            info="Estimated one-time costs to store info in BOS"
          />
          <b>
            <SummaryListItem title="Total" value={REQUIRED_BALANCE} />
          </b>
        </ul>
      </div>
      {balance < REQUIRED_BALANCE && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
          props={{
            type: "alert",
            text: `Your ${balance} balance is insufficient to cover the treasury creation costs. You'll need at least ${
              REQUIRED_BALANCE - balance.toFixed(2)
            } NEAR to continue.
    `,
          }}
        />
      )}
    </Section>
    <Link
      className={`btn btn-primary w-100 ${
        balance < REQUIRED_BALANCE ? "disabled" : ""
      }`}
      href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=1`}
    >
      Yes, use this wallet and continue
    </Link>
  </>
);
