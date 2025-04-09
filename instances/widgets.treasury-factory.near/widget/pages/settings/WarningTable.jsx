const { proposals, warningText } = props;

const { decodeProposalDescription } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  decodeProposalDescription: () => {},
};

const { InfoBlock } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InfoBlock`
) || { InfoBlock: () => <></> };

return (
  <div className="d-flex flex-column gap-4">
    <InfoBlock type="warning" description={warningText} />

    <div className="card overflow-auto">
      <table className="table table-simple">
        <thead>
          <tr className="text-secondary">
            <th>Id</th>
            <th>Submission date</th>
            <th>Title</th>
            <th>Description</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((proposal) => (
            <tr class="proposal-in-progress">
              <td className="fw-semi-bold px-3">{proposal.id}</td>
              <td style={{ width: "150px" }}>
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                  props={{
                    timestamp: proposal.submission_time,
                  }}
                />
              </td>
              <td>
                <div className="text-left text-clamp">
                  {decodeProposalDescription("title", proposal.description)}
                </div>
              </td>
              <td>
                <div className="text-left text-clamp">
                  {decodeProposalDescription("summary", proposal.description)}
                </div>
              </td>
              <td className="text-center">
                <a
                  target="_blank"
                  href={`?page=settings&id=${proposal.id}`}
                  className="btn btn-outline-secondary d-flex align-items-center"
                >
                  Details
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
