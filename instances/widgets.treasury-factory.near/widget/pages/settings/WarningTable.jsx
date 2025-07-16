const { tableProps, warningText, descriptionText, includeExpiryDate } = props;

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
    {warningText && <InfoBlock type="warning" description={warningText} />}
    {descriptionText && <p className="mb-0">{descriptionText}</p>}
    {tableProps.map(({ title, proposals, testId }) => (
      <>
        {proposals.length > 0 && (
          <div key={title} className="flex flex-column">
            {title && <h6 className="text-secondary">{title}</h6>}

            <div className="card overflow-auto">
              <table className="table table-simple">
                <thead>
                  <tr className="text-secondary">
                    <th>#</th>
                    <th>Created Date</th>
                    {includeExpiryDate && (
                      <>
                        <th>Expiry date</th>
                        <th>New expiry</th>
                      </>
                    )}
                    <th>Title</th>
                    <th>Created By</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr data-testid={testId} class="proposal-in-progress">
                      <td
                        className="fw-semi-bold px-3"
                        style={{ width: "55px" }}
                      >
                        {proposal.id}
                      </td>
                      <td style={{ width: "130px" }}>
                        <Widget
                          loading=""
                          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                          props={{
                            timestamp:
                              proposal.submissionTimeMillis ??
                              proposal.submission_time,
                          }}
                        />
                      </td>
                      {includeExpiryDate && (
                        <>
                          <td style={{ width: "110px" }}>
                            <Widget
                              loading=""
                              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                              props={{ timestamp: proposal.currentExpiryTime }}
                            />
                          </td>
                          <td style={{ width: "110px" }}>
                            <Widget
                              loading=""
                              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                              props={{ timestamp: proposal.newExpiryTime }}
                            />
                          </td>
                        </>
                      )}
                      <td>
                        <div className="text-left text-clamp">
                          {decodeProposalDescription(
                            "title",
                            proposal.description
                          )}
                        </div>
                      </td>
                      <td>{proposal.proposer}</td>
                      <td className="text-center" style={{ width: "100px" }}>
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
        )}
      </>
    ))}
  </div>
);
