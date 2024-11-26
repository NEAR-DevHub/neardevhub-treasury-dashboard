const type = props.type;

const classes =
  "d-flex gap-2 align-items-center justify-content-center border rounded-pill py-1 px-2";

const Badge = () => {
  switch (type) {
    case "unstake": {
      return (
        <div className={classes}>
          <img src={"${REPL_UNSTAKE_ICON}"} height={20} />
          Unstake
        </div>
      );
    }
    case "withdraw_all":
    case "withdraw_all_from_staking_pool": {
      return (
        <div className={classes}>
          <img src={"${REPL_WITHDRAW_ICON}"} height={20} />
          Unstake
        </div>
      );
    }
    default: {
      return (
        <div className={classes}>
          <img src={"${REPL_STAKE_ICON}"} height={20} />
          Stake
        </div>
      );
    }
  }
};

return <Badge />;
