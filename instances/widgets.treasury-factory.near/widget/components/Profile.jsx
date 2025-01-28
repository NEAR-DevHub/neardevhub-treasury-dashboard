const { VerifiedTick, NotVerfiedTick, User, Copy } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  VerifiedTick: () => <></>,
  NotVerfiedTick: () => <></>,
  User: () => <></>,
  Copy: () => <></>,
};

const showKYC = props.showKYC;
const accountId = props.accountId;
const displayName = props.displayName ?? true;
const displayImage = props.displayImage ?? true;
const width = props.width ?? null;
const [isVerfied, setIsVerfied] = useState(false);
const [verificationStatus, setVerificationStatus] = useState(null);

const profile = Social.getr(`${accountId}/profile`);
const imageSrc =
  `https://i.near.social/magic/large/https://near.social/magic/img/account/${accountId}` ??
  "https://ipfs.near.social/ipfs/bafkreibmiy4ozblcgv3fm3gc6q62s55em33vconbavfd2ekkuliznaq3zm";
const name = profile.name;

useEffect(() => {
  if (
    showKYC &&
    (accountId.length === 64 ||
      (accountId ?? "").includes(".near") ||
      (accountId ?? "").includes(".tg"))
  ) {
    asyncFetch(
      `https://neardevhub-kyc-proxy.shuttleapp.rs/kyc/${accountId}`
    ).then((res) => {
      let displayableText = "";
      switch (res.body.kyc_status) {
        case "Approved":
          displayableText = "Verified";
          setIsVerfied(true);
          break;
        case "Pending":
          displayableText = "Pending";
          break;
        case "NotSubmitted":
        case "Rejected":
          displayableText = "Not Verfied";
          break;
        default:
          displayableText = "Failed to get status";
          break;
      }
      setVerificationStatus(displayableText);
    });
  }
}, [accountId]);

const ProfileLink = styled.a`
  color: var(--text-color);
  &:hover {
    color: var(--text-color);
  }
`;

const HoverCard = () => {
  return (
    <div style={{ width: 200 }} className="py-1">
      <div className="d-flex flex-column gap-2">
        <div className="d-flex gap-2 align-items-center">
          <img
            src={imageSrc}
            height={40}
            width={40}
            className="rounded-circle"
          />
          <div className="d-flex flex-column gap-1">
            <div className="h6 mb-0"> {name}</div>

            <div className="text-break">@{accountId}</div>
          </div>
        </div>
        {verificationStatus && (
          <div className="d-flex align-items-center gap-2">
            {verificationStatus === "Verified" ? (
              <VerifiedTick width={30} height={30} />
            ) : (
              <NotVerfiedTick width={30} height={30} />
            )}
            <div className="h6 mb-0">Fractal {verificationStatus}</div>
          </div>
        )}
        <div
          className="border-top d-flex pt-2 flex-column"
          style={{ gap: "0.7rem" }}
        >
          <ProfileLink
            target="_blank"
            rel="noopener noreferrer"
            href={`https://near.social/mob.near/widget/ProfilePage?accountId=${accountId}`}
            className="d-flex gap-2 align-items-center"
          >
            <User width={25} height={25} /> Open Profile
          </ProfileLink>

          <div
            className="d-flex gap-2 align-items-center"
            style={{ cursor: "pointer" }}
            onClick={() => clipboard.writeText(accountId)}
          >
            <Copy width={25} height={25} />
            Copy wallet address
          </div>
        </div>
      </div>
    </div>
  );
};

const ReceiverAccountComponent = (
  <div
    className="d-flex gap-1 align-items-center"
    style={{ width: width ? width : displayImage ? "180px" : "100px" }}
  >
    {displayImage && (
      <div style={{ width: "40px", height: 40, position: "relative" }}>
        <img src={imageSrc} height={40} width={40} className="rounded-circle" />
        <div style={{ marginTop: "-20px", marginLeft: "22px" }}>
          {verificationStatus &&
            (isVerfied ? <VerifiedTick /> : <NotVerfiedTick />)}
        </div>
      </div>
    )}

    <div
      className="text-truncate"
      style={{ width: width ? width : displayImage ? "150px" : "100px" }}
    >
      {displayName && <div className="h6 mb-0"> {name}</div>}
      <div>
        {displayName && "@"} {accountId}
      </div>
    </div>
  </div>
);

return (
  <div>
    <Widget
      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
      props={{
        popup: <HoverCard />,
        children: ReceiverAccountComponent,
        instance: props.instance,
        rootClose: false,
      }}
    />
  </div>
);
