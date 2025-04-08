const { getCurrentUserTreasuries, accountToLockup, getNearBalances } =
  VM.require("${REPL_DEVDAO_ACCOUNT}/widget/lib.common");

const accountId = context.accountId;

const userTreasuries = accountId
  ? useCache(
      () => getCurrentUserTreasuries(accountId),
      accountId + "-user-treasuries",
      {
        subscribe: false,
      }
    )
  : [];

const Container = styled.div`
  max-width: 560px;
  width: 100%;
  font-size: 14px;

  label {
    color: black !important;
  }
`;

const defaultImage =
  "https://ipfs.near.social/ipfs/bafkreia5drpo7tfsd7maf4auxkhatp6273sunbg7fthx5mxmvb2mooc5zy";

return (
  <div className="d-flex flex-column align-items-center w-100 mb-4">
    <Container className="d-flex flex-column gap-3">
      <div className="d-flex flex-row w-100 align-items-center justify-content-md-center justify-content-end fw-bold">
        <h3 className="mb-0">My Treasuries</h3>
      </div>

      <a target="_blank" rel="noopener noreferrer" href={`?page=create`}>
        <button className="btn btn-primary">
          <i class="bi bi-plus"></i>Create Treasury
        </button>
      </a>
      <div className="d-flex flex-column gap-3">
        {Array.isArray(userTreasuries) &&
          userTreasuries.length > 0 &&
          userTreasuries.map((treasury) => {
            const lockupContract = accountToLockup(treasury.daoId);
            const primaryColor =
              treasury.config.metadata.primaryColor ?? "#01BF7A";
            const balance = getNearBalances(treasury.daoId);
            return (
              <div className="card card-body d-flex flex-column gap-3">
                <div className={`d-flex gap-3 align-items-center`}>
                  <img
                    src={
                      treasury.config.metadata?.flagLogo?.includes("ipfs")
                        ? treasury.config.metadata?.flagLogo
                        : defaultImage
                    }
                    width={48}
                    height={48}
                    className="rounded-3 object-fit-cover"
                  />
                  <div className="d-flex flex-column">
                    <div className="h6 mb-0">{treasury.config.name}</div>
                    <div className="text-secondary text-sm">
                      @{treasury.instanceAccount}
                    </div>
                  </div>
                </div>
                <div
                  className="border-top pt-3"
                  style={{ color: primaryColor }}
                >
                  <label>Spuntik DAO: </label>
                  <span className="fw-semi-bold"> {treasury.daoId} </span>
                  {lockupContract && (
                    <div>
                      <label>Lockup: </label>{" "}
                      <span className="fw-semi-bold"> {lockupContract} </span>
                    </div>
                  )}
                </div>
                <div className="border border-1 p-3 rounded-3 d-flex flex-column gap-2">
                  <div className="text-secondary">Total Balance</div>
                  <div className="h6 mb-0 fw-bold">
                    ${balance?.availableParsed}
                  </div>
                </div>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://${treasury.instanceAccount}.page/`}
                >
                  <button className="text-align-center btn btn-outline-secondary w-100">
                    Open
                  </button>
                </a>
              </div>
            );
          })}
      </div>
    </Container>
  </div>
);
