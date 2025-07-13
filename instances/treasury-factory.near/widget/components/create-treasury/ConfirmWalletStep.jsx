const { getNearBalances } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
);
if (!getNearBalances) return <></>;

const { setCurrentPage } = props;
const REQUIRED_BALANCE = 9;

let balance = getNearBalances(context.accountId);
balance = balance ? parseFloat(balance.availableParsed) : 0;

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
      <h3>Confirm Your Wallet</h3>
      <p>
        This is the account that will be used to pay for creating the treasury
        and managing it initially. Ensure it has sufficient funds to cover the
        setup costs below.
      </p>
    </Section>
    <Section className="d-flex flex-column gap-3">
      <h4>Connected Wallet</h4>
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
        props={{ accountId: context.accountId }}
      />
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "info",
          text: "This is your personal NEAR wallet used for setup. The treasury will have its own separate wallet.",
        }}
      />
      <div className="mt-3">
        <h4>Estimated One-Time Costs</h4>
        <ul>
          <SummaryListItem
            title="SputnikDAO"
            value={6}
            info="Estimated one-time costs to store info in SputnikDAO"
          />
          <SummaryListItem
            title="Frontend BOS Widget Hosting"
            value={3}
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
    <div className="d-flex gap-2">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
        props={{
          classNames: {
            root: "btn btn-primary w-100",
          },
          disabled: balance > REQUIRED_BALANCE,
          label: "Continue",
          onClick: () => {
            setCurrentPage(1);
          },
        }}
      />
    </div>
  </>
);
