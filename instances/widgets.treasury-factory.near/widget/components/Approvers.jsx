const { isNearSocial } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  isNearSocial: false,
};

const votes = props.votes ?? {};
const accounts = Object.keys(votes);
const approversGroup = props.approversGroup ?? [];
const maxShow = 1;
const showHover = accounts?.length > maxShow;
const approve =
  "https://ipfs.near.social/ipfs/bafkreib52fq4kw7gyfsupz4mrtrexbusc2lplxnopqswa5awtnlqmenena";
const reject =
  "https://ipfs.near.social/ipfs/bafkreihrwi2nzl7d2dyij3tstr6tdr7fnioq7vu37en3dxt4faihxreabm";

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

const ApproversComponent = (
  <div className="d-flex align-items-center">
    {accounts.slice(0, maxShow).map((acc, index) => {
      const imageSrc = getImage(acc);
      const voteImg = votes[acc] === "Approve" ? approve : reject;
      return (
        <div
          style={{
            marginLeft: index > 0 ? "-10px" : 0,
            zIndex: maxIndex - index,
            position: "relative",
          }}
        >
          <img
            src={imageSrc}
            height={40}
            width={40}
            className="rounded-circle"
          />
          <img
            src={voteImg}
            height={20}
            style={
              isNearSocial
                ? { marginTop: 25, marginLeft: "-20px" }
                : { marginTop: "-17px", marginLeft: "23px" }
            }
          />
        </div>
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
                        <img
                          src={imageSrc}
                          height={40}
                          width={40}
                          className="rounded-circle"
                        />
                        {voted && (
                          <img
                            src={voteImg}
                            height={20}
                            style={
                              isNearSocial
                                ? { marginTop: 17, marginLeft: "-15px" }
                                : { marginTop: "-19px", marginLeft: "21px" }
                            }
                          />
                        )}
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
