const { Approval, Reject } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  Approval: () => <></>,
  Reject: () => <></>,
};

const votes = props.votes ?? {};
const accounts = Object.keys(votes);
const approversGroup = props.approversGroup ?? [];
const maxShow = 1;
const showHover = accounts?.length > maxShow;
const maxIndex = 100;

const Container = styled.div`
  .grey-circle {
    width: 40px;
    height: 40px;
    background-color: var(--grey-04);
  }
`;

function getImage(acc) {
  return `https://i.near.social/magic/large/https://near.social/magic/img/account/${acc}`;
}

const ApprovalImage = styled.div`
  position: relative;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 40px;
  width: 40px;
  .status {
    position: absolute;
    bottom: 0;
    right: 0;
  }
`;

const ApproversComponent = (
  <div className="d-flex align-items-center">
    {accounts.slice(0, maxShow).map((acc, index) => {
      const imageSrc = getImage(acc);
      return (
        <ApprovalImage
          style={{
            marginLeft: index > 0 ? "-10px" : 0,
            zIndex: maxIndex - index,
            backgroundImage: `url("${imageSrc}")`,
          }}
          className="rounded-circle"
        >
          <div className="status">
            {votes[acc] === "Approve" ? <Approval /> : <Reject />}
          </div>
        </ApprovalImage>
      );
    })}
    {accounts.length > maxShow && (
      <div
        style={{ marginLeft: "-10px" }}
        className="grey-circle rounded-circle d-flex justify-content-center align-items-center"
      >
        +{accounts.length - maxShow}
      </div>
    )}
  </div>
);

function getVoteStatus(vote) {
  switch (vote) {
    case "Approve":
      return "Approved";
    case "Reject":
      return "Rejected";
    case "Remove":
      return "Deleted";
    default:
      return "";
  }
}

return (
  <Container className="d-flex justify-content-center">
    {showHover ? (
      <Widget
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
        props={{
          popup: (
            <div className="p-1">
              <div className="d-flex flex-column gap-3">
                {approversGroup.map((acc) => {
                  const profile = Social.getr(`${acc}/profile`);
                  const name = profile.name;
                  const imageSrc = getImage(acc);
                  const voted = !!votes[acc];
                  const votesStatus = getVoteStatus(votes[acc]);
                  const voteImg = votesStatus === "Approved" ? approve : reject;
                  return (
                    <div
                      className="d-flex gap-2 align-items-center"
                      style={{
                        color: voted ? "" : "#B3B3B3",
                        opacity: voted ? " " : "0.6",
                      }}
                    >
                      <div>
                        <ApprovalImage
                          style={{
                            backgroundImage: `url("${imageSrc}")`,
                          }}
                          className="rounded-circle"
                        >
                          {voted && (
                            <div className="status">
                              {votes[acc] === "Approve" ? (
                                <Approval />
                              ) : (
                                <Reject />
                              )}
                            </div>
                          )}
                        </ApprovalImage>
                      </div>
                      <div className="d-flex flex-column">
                        <div className="h6 mb-0 text-break">{name ?? acc}</div>
                        <div className="d-flex">
                          {voted ? (
                            <span
                              style={{
                                color:
                                  votesStatus === "Approved"
                                    ? "#3CB179"
                                    : "#D95C4A",
                              }}
                            >
                              {votesStatus}{" "}
                            </span>
                          ) : (
                            "Not Voted"
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ),
          children: ApproversComponent,
          instance: props.instance,
        }}
      />
    ) : (
      ApproversComponent
    )}
  </Container>
);
