const instance = props.instance;
if (!instance) {
  return <></>;
}

const { instanceHasUpdates } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationTracker"
) ?? { instanceHasUpdates: () => false };

const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => false,
};

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const hasEditPermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "AddProposal"
);

const hasUpdates = instanceHasUpdates(instance);

return hasEditPermission && hasUpdates ? (
  <div className="system-update-banner">
    <small className="badge">New</small>
    New system updates published, check if your instance is up to date.{" "}
    <a href="?page=settings&tab=system-updates">Review</a>
  </div>
) : (
  <></>
);
