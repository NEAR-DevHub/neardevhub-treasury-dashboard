const isStakeRequest = props.isStakeRequest;

const classes =
  "d-flex gap-1 align-items-center justify-content-center border rounded-pill py-1 px-2";
if (isStakeRequest) {
  return (
    <div className={classes}>
      <i class="bi bi-box-arrow-in-up h6 mb-0"></i>
      Stake
    </div>
  );
} else
  return (
    <div className={classes}>
      <i class="bi bi-box-arrow-in-down"></i>
      Unstake
    </div>
  );
