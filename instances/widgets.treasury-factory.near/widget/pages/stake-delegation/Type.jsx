const { StakeIcon, UnstakeIcon, WithdrawIcon, Whitelist } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  StakeIcon: () => <></>,
  UnstakeIcon: () => <></>,
  WithdrawIcon: () => <></>,
  Whitelist: () => <></>,
};

const type = props.type;

const classes =
  "d-flex gap-2 align-items-center justify-content-center border rounded-pill py-1 px-2";

const Badge = () => {
  switch (type) {
    case "unstake": {
      return (
        <div className={classes}>
          <UnstakeIcon />
          Unstake
        </div>
      );
    }
    case "withdraw_all":
    case "withdraw_all_from_staking_pool": {
      return (
        <div className={classes}>
          <WithdrawIcon />
          Withdraw
        </div>
      );
    }
    case "select_staking_pool": {
      return (
        <div className={classes}>
          <Whitelist />
          Whitelist
        </div>
      );
    }
    default: {
      return (
        <div className={classes}>
          <StakeIcon />
          Stake
        </div>
      );
    }
  }
};

return <Badge />;
