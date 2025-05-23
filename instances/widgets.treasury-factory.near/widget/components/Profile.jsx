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
const profileClass = props.profileClass ?? "";

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
      `https://neardevhub-kyc-proxy-gvbr.shuttle.app/kyc/${accountId}`
    ).then((res) => {
      let displayableText = "";
      switch (res.body.kyc_status) {
        case "APPROVED":
          displayableText = "Verified";
          setIsVerfied(true);
          break;
        case "PENDING":
          displayableText = "Pending";
          break;
        case "NOT_SUBMITTED":
        case "REJECTED":
          displayableText = "Not Verified";
          break;
        case "EXPIRED":
          displayableText = "Expired";
          break;
        default:
          displayableText = ": Failed to get status";
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

const HoverCard = () => (
  <div style={{ width: 200 }} className="py-1">
    <div className="d-flex flex-column gap-2">
      <div className="d-flex gap-2 align-items-center">
        <img src={imageSrc} height={40} width={40} className="rounded-circle" />
        <div className="d-flex flex-column gap-1">
          <div className="h6 mb-0">{name}</div>
          <div className="text-break">@{accountId}</div>
        </div>
      </div>
      {verificationStatus && (
        <div className="d-flex align-items-center gap-2">
          {isVerfied ? (
            <VerifiedTick width={30} height={30} />
          ) : (
            <NotVerfiedTick width={30} height={30} />
          )}
          <div>Fractal {verificationStatus}</div>
        </div>
      )}
      <div
        className="border-top d-flex pt-2 flex-column"
        style={{ gap: "0.7rem" }}
      >
        <ProfileLink
          onClick={(e) => e.stopPropagation()}
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
          onClick={(e) => {
            e.stopPropagation();
            clipboard.writeText(accountId);
          }}
        >
          <Copy width={25} height={25} />
          Copy wallet address
        </div>
      </div>
    </div>
  </div>
);

const ReceiverAccountComponent = (
  <div className="d-flex gap-2 align-items-center" style={{ minWidth: 0 }}>
    {displayImage && (
      <div
        style={{
          flex: "0 0 auto",
          width: 35,
          height: 35,
          position: "relative",
        }}
      >
        <img src={imageSrc} height={35} width={35} className="rounded-circle" />
        <div style={{ position: "absolute", bottom: "-5px", right: "-5px" }}>
          {verificationStatus &&
            (isVerfied ? <VerifiedTick /> : <NotVerfiedTick />)}
        </div>
      </div>
    )}

    <div className="d-flex flex-column" style={{ minWidth: 0, flex: 1 }}>
      {displayName && (
        <div className="mb-0 text-truncate" title={name}>
          {name}
        </div>
      )}
      <div
        className={`text-truncate ${profileClass}`}
        title={accountId}
        style={{
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {displayName ? "@" + accountId : accountId}
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
        containerClass: "d-flex",
      }}
    />
  </div>
);
