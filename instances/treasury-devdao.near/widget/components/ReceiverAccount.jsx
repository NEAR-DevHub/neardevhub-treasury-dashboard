const { isNearSocial } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  isNearSocial: false,
};
const showKYC = props.showKYC;
const receiverAccount = props.receiverAccount;
const [isVerfied, setIsVerfied] = useState(false);
const [verificationStatus, setVerificationStatus] = useState(null);

const profile = Social.getr(`${receiverAccount}/profile`);
const imageSrc =
  `https://i.near.social/magic/large/https://near.social/magic/img/account/${receiverAccount}` ??
  "https://ipfs.near.social/ipfs/bafkreibmiy4ozblcgv3fm3gc6q62s55em33vconbavfd2ekkuliznaq3zm";
const name = profile.name;

const WarningImg =
  "https://ipfs.near.social/ipfs/bafkreianby5lkljarqct47uofj6uxjmw7lkglnf5a4jua7aubul46aqdje";

const SuccessImg =
  "https://ipfs.near.social/ipfs/bafkreigxe4ludhipu2j46jt57iuyufkbnwkuhjixocguwjdcktfsxekghu";

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
      <div className="d-flex text-black justify-content-between align-items-center ">
        <div className="d-flex" style={{ gap: "12px" }}>
          <img
            className="align-self-center object-fit-cover"
            src={verificationStatus === "Verified" ? SuccessImg : WarningImg}
            height={20}
          />
          <div className="d-flex flex-column justify-content-center">
            <div className="h6 mb-0">Fractal</div>
            <div className="text-sm text-muted">{verificationStatus}</div>
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
      {verificationStatus && (
        <img
          src={isVerfied ? SuccessImg : WarningImg}
          height={20}
          width={20}
          style={
            isNearSocial
              ? { marginTop: "-35px", marginLeft: "23px" }
              : { marginTop: "-17px", marginLeft: "19px" }
          }
        />
      )}
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
        src="${REPL_MOB}/widget/N.Common.OverlayTrigger"
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
