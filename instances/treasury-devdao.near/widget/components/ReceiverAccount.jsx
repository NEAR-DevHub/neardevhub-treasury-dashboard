const { VerifiedTick, NotVerfiedTick } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { VerifiedTick: () => <></>, NotVerfiedTick: () => <></> };

const showKYC = props.showKYC;
const receiverAccount = props.receiverAccount;
const [isVerfied, setIsVerfied] = useState(false);
const [verificationStatus, setVerificationStatus] = useState(null);

const profile = Social.getr(`${receiverAccount}/profile`);
const imageSrc =
  `https://i.near.social/magic/large/https://near.social/magic/img/account/${receiverAccount}` ??
  "https://ipfs.near.social/ipfs/bafkreibmiy4ozblcgv3fm3gc6q62s55em33vconbavfd2ekkuliznaq3zm";
const name = profile.name;

useEffect(() => {
  if (
    showKYC &&
    (receiverAccount.length === 64 ||
      (receiverAccount ?? "").includes(".near") ||
      (receiverAccount ?? "").includes(".tg"))
  ) {
    asyncFetch(
      `https://neardevhub-kyc-proxy.shuttleapp.rs/kyc/${receiverAccount}`
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
}, [receiverAccount]);

const HoverCard = () => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center ">
        <div className="d-flex" style={{ gap: "12px" }}>
          {verificationStatus === "Verified" ? (
            <VerifiedTick />
          ) : (
            <NotVerfiedTick />
          )}

          <div className="d-flex flex-column justify-content-center">
            <div className="h6 mb-0">Fractal</div>
            <div className="text-sm text-secondary">{verificationStatus}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReceiverAccountComponent = (
  <div className="d-flex gap-1 align-items-center" style={{ width: 180 }}>
    <div style={{ width: "40px", height: 40, position: "relative" }}>
      <img src={imageSrc} height={40} width={40} className="rounded-circle" />
      <div style={{ marginTop: "-20px", marginLeft: "22px" }}>
        {verificationStatus &&
          (isVerfied ? <VerifiedTick /> : <NotVerfiedTick />)}
      </div>
    </div>
    <div
      className="text-truncate"
      style={{ textAlign: "left", width: "150px" }}
    >
      <div className="h6 mb-0"> {name}</div>

      <div>@{receiverAccount}</div>
    </div>
  </div>
);

return (
  <div>
    {verificationStatus ? (
      <Widget
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
        props={{
          popup: verificationStatus && <HoverCard />,
          children: ReceiverAccountComponent,
        }}
      />
    ) : (
      ReceiverAccountComponent
    )}
  </div>
);
