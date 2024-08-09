const { isNearSocial } = VM.require(
  "${REPL_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  isNearSocial: false,
};

const receiverAccount = props.receiverAccount;
const [isVerfied, setIsVerfied] = useState(false);
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
    receiverAccount.length === 64 ||
    (receiverAccount ?? "").includes(".near") ||
    (receiverAccount ?? "").includes(".tg")
  ) {
    useCache(
      () =>
        asyncFetch(
          `https://neardevhub-kyc-proxy.shuttleapp.rs/kyc/${receiverAccount}`
        ).then((res) => {
          let displayableText = "";
          switch (res.body.kyc_status) {
            case "Approved":
              setIsVerfied(true);
              break;

            default:
              setIsVerfied(false);
              break;
          }
        }),
      "kyc-check-proposal" + receiverAccount,
      { subscribe: false }
    );
  }
}, [receiverAccount]);

const Container = styled.div`
  .text-red {
    color: #3cb179;
  }

  .text-green {
    color: #d95c4a;
  }
`;

return (
  <div className="d-flex gap-1 align-items-center">
    <div style={{ minWidth: "40px", position: "relative" }}>
      <img src={imageSrc} height={40} width={40} className="rounded-circle" />
      <img
        src={isVerfied ? SuccessImg : WarningImg}
        height={20}
        width={20}
        style={
          isNearSocial
            ? { marginTop: 25, marginLeft: "-20px" }
            : { marginTop: "-17px", marginLeft: "23px" }
        }
      />
    </div>
    <div
      className="text-truncate"
      style={{ textAlign: "left", width: "150px" }}
    >
      <div className="h6 mb-0"> {name}</div>

      <div className={isVerfied ? "text-green" : "text-red"}>
        @{receiverAccount}
      </div>
    </div>
  </div>
);
