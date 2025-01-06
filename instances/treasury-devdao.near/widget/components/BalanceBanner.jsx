const { getNearBalances, hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const Container = styled.div`
  .low-balance-warning {
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;

    h5 {
      color: var(--other-warning) !important;
    }
  }

  .insufficient-balance-warning {
    background-color: rgba(217, 92, 74, 0.08);
    color: var(--other-red);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;

    h5 {
      color: var(--other-red) !important;
    }
  }
`;

function formatNearAmount(amount) {
  return parseFloat(
    Big(amount ?? "0")
      .div(Big(10).pow(24))
      .toFixed(2)
  );
}

function BalanceBanner({ accountId, treasuryDaoID }) {
  if (
    typeof getNearBalances !== "function" ||
    !accountId ||
    typeof hasPermission !== "function"
  ) {
    return <></>;
  }

  const nearBalances = getNearBalances(accountId);
  const hasCreatePermission = hasPermission(
    treasuryDaoID,
    accountId,
    "transfer",
    "AddProposal"
  );

  const daoPolicy = useCache(
    () => Near.asyncView(treasuryDaoID, "get_policy"),
    "get_policy",
    { subscribe: false }
  );

  // if they have create permission they need deposit amount for add proposal
  const ADDITIONAL_AMOUNT = hasCreatePermission
    ? formatNearAmount(daoPolicy?.proposal_bond)
    : 0;

  const LOW_BALANCE_LIMIT = ADDITIONAL_AMOUNT + 0.7; // 0.7N
  const INSUFFICIENT_BALANCE_LIMIT = ADDITIONAL_AMOUNT + 0.3; // 0.3N

  const profile = Social.getr(`${accountId}/profile`);
  const name = profile.name ?? accountId;

  return (
    <Container>
      {!nearBalances ||
      !nearBalances.availableParsed ||
      nearBalances.availableParsed === "0.00" ||
      parseFloat(nearBalances.availableParsed) > LOW_BALANCE_LIMIT ? (
        <></>
      ) : parseFloat(nearBalances.availableParsed) <
        INSUFFICIENT_BALANCE_LIMIT ? (
        <div className="insufficient-balance-warning d-flex gap-3 p-3 rounded-3 m-3">
          <i class="bi bi-exclamation-octagon error-icon h4 mb-0"></i>
          <div>
            <h5>Insufficient Funds</h5>
            Hey {name}, you don't have enough NEAR to complete actions on your
            treasury. You need at least {INSUFFICIENT_BALANCE_LIMIT}N. Please
            add more funds to your account and try again
          </div>
        </div>
      ) : (
        <div className="low-balance-warning d-flex gap-3 p-3 rounded-3 m-3">
          <i class="bi bi-exclamation-triangle warning-icon h4 mb-0"></i>
          <div>
            <h5>Low Balance</h5>
            Hey {name}, your NEAR balance is {nearBalances.availableParsed}N,
            which is getting low. The minimum balance required is{" "}
            {INSUFFICIENT_BALANCE_LIMIT}N. Please add more NEAR to your account
            soon to avoid any issues completing actions on your treasury.
          </div>
        </div>
      )}
    </Container>
  );
}

return { BalanceBanner };
