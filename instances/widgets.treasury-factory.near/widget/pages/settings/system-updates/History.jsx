const {
  finishedUpdates,

  UPDATE_TYPE_WEB4_CONTRACT,
} =
  VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationTracker"
  ) ?? {};

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
          </tr>
        </thead>
        <tbody>
          {finishedUpdates.map((update) => (
            <tr key={update.id}>
              <td className="px-3">{update.id}</td>
              <td>{update.createdDate}</td>
              <td>{update.version}</td>
              <td>{update.type}</td>
              <td>{update.summary}</td>
              <td>{update.votingRequired ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Container>
);
