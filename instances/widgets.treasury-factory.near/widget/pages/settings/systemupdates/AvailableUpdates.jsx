const { instance } = props;

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;
  display: flex;

  td {
    padding: 0.5rem;
    color: inherit;
    vertical-align: middle;
    background: inherit;
  }

  thead td {
    text-wrap: nowrap;
  }

  table {
    overflow-x: auto;
  }
`;

return (
  <Container style={{ overflowX: "auto" }}>
    <div className="w-100">
      <table className="table">
        <thead>
          <tr className="text-secondary">
            <td className="px-3">#</td>
            <td>Created Date</td>
            <td>Version</td>
            <td>Type</td>
            <td>Summary</td>
            <td>Voting required</td>
            <td>Actions</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3">1</td>
            <td>2023-10-01</td>
            <td>1.0</td>
            <td>Web4 Contract</td>
            <td>contract update</td>
            <td>No</td>
            <td>
              <Widget
                src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                props={{
                  classNames: {
                    root: "btn btn-success shadow-none",
                  },
                  label: "Review",
                  onClick: () => {
                    Near.call([
                      {
                        contractName: instance,
                        methodName: "self_upgrade",
                        args: {},
                        gas: 300_000_000_000_000,
                        deposit: 0,
                      },
                    ]);
                  },
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Container>
);
