const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});

if (!daoPolicy) {
  return <></>;
}

const currentDurationDays =
  Number(
    daoPolicy.proposal_period.substr(
      0,
      daoPolicy.proposal_period.length - "000000000".length
    )
  ) /
  (60 * 60 * 24);
const [durationDays, setDurationDays] = useState(currentDurationDays);

const Container = styled.div`
  font-size: 14px;
  .border-right {
    border-right: 1px solid rgba(226, 230, 236, 1);
  }

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid rgba(226, 230, 236, 1);
  }

  .selected-role {
    background-color: rgba(244, 244, 244, 1);
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .tag {
    background-color: rgba(244, 244, 244, 1);
    font-size: 12px;
    padding-block: 5px;
  }

  label {
    color: rgba(153, 153, 153, 1);
    font-size: 12px;
  }

  .fw-bold {
    font-weight: 500 !important;
  }

  .p-0 {
    padding: 0 !important;
  }

  .text-md {
    font-size: 13px;
  }

  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: rgba(177, 113, 8, 1);
    font-weight: 500;
  }

  .text-sm {
    font-size: 12px !important;
  }

  .text-muted {
    color: rgba(153, 153, 153, 1);
  }

  .text-red {
    color: #d95c4a;
  }

  .toast {
    background: white !important;
  }

  .toast-header {
    background-color: #2c3e50 !important;
    color: white !important;
  }
`;

const cancelChangeRequest = () => {
  setDurationDays(currentDurationDays);
};

const submitChangeRequest = () => {
  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: "Change proposal period",
          kind: {
            ChangePolicyUpdateParameters: {
              parameters: {
                proposal_period:
                  (60 * 60 * 24 * durationDays).toString() + "000000000",
              },
            },
          },
        },
      },
      deposit: daoPolicy.proposal_bond,
    },
  ]);
};

return (
  <Container>
    <div className="card rounded-3" style={{ maxWidth: "30rem" }}>
      <div className="card-title px-3">Voting Duration</div>
      <div className="card-body">
        <p>
          Set the number of days a vote is active. A decision expires if voting
          is not completed within this period.
        </p>
        <p>
          <label for="exampleInputEmail1" class="px-3">
            Number of days
          </label>
          <input
            type="number"
            class="form-control"
            aria-describedby="votingDurationHelp"
            placeholder="Enter voting duration days"
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
          ></input>
          <small id="votingDurationHelp" class="form-text text-muted px-3">
            Enter number of days that a vote should be active
          </small>
        </p>
        <button class="btn btn-light" onClick={cancelChangeRequest}>
          Cancel
        </button>
        <button class="btn btn-success" onClick={submitChangeRequest}>
          Submit Request
        </button>
      </div>
    </div>
  </Container>
);
