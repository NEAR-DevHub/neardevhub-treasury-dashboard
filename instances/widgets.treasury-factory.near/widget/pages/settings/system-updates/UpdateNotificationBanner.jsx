const { hasUpdates } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationTracker"
) ?? { hasUpdates: false };

const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => false,
};

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const hasEditPermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "AddProposal"
);

return hasEditPermission && hasUpdates ? (
  <div
    style={{
      backgroundColor: "#e4ece8",
      padding: "8px",
      textAlign: "center",
      fontWeight: 300,
    }}
  >
    <small
      className="badge badge-success"
      style={{ backgroundColor: "#60ae7e", color: "#ffffff" }}
    >
      New
    </small>
    You have pending system updates{" "}
    <a
      style={{ textDecoration: "underline" }}
      href="?page=settings&tab=system-updates"
    >
      Review
    </a>
  </div>
) : (
  <></>
);
