const { instance } = props;
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

return (
  <div
    className="card card-body d-flex flex-column gap-2 text-left"
    style={{ maxWidth: "600px", fontSize: "14px" }}
  >
    <div className="h4 mb-0">Sputnik DAO</div>
    <div style={{ fontWeight: 500 }}>
      Best for tokens on NEAR with full treasury control: payments, staking,
      asset exchange and lockups.
    </div>
    <div className="mt-2">
      <Widget
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.intents-deposit.DepositAddress"
        props={{
          address: treasuryDaoID,
          warningMessage: "Only deposit from the NEAR network.",
          instance,
        }}
      />
    </div>
  </div>
);
