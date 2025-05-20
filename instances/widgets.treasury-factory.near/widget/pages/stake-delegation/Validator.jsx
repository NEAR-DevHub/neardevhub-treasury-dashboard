const { isBosGateway } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const validatorId = props.validatorId;
const pikespeakKey = isBosGateway()
  ? "${REPL_GATEWAY_PIKESPEAK_KEY}"
  : props.pikespeakKey ?? "${REPL_INDIVIDUAL_PIKESPEAK_KEY}";

if (!pikespeakKey) {
  return (
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
      props={{
        accountId: validatorId,
        showKYC: false,
        instance: props.instance,
        displayImage: false,
        displayName: false,
      }}
    />
  );
}

const options = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": pikespeakKey,
  },
};

const data = fetch(
  `https://api.pikespeak.ai/validators/details/${validatorId}`,
  options
)?.body;

const fee = data?.fees?.numerator ?? 1 / data?.fees?.denominator ?? 100;
const isActive = !data?.is_slashed;

const Container = styled.div`
  .text-green {
    color: #34c759;
  }

  .text-sm {
    font-size: 12px;
  }
`;

return (
  <Container className="d-flex flex-column gap-1 bold">
    <div> {validatorId}</div>
    <div className="d-flex gap-2 align-items-center text-sm">
      <div className="text-secondary">{fee}% Fee</div>
      {isActive && <div className="text-green">Active</div>}
    </div>
  </Container>
);
