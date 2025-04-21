function checkIfPolicyIsUpToDate(instance) {
  const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
  const {
    updatesNotApplied,
    finishedUpdates,
    setFinishedUpdates,
    UPDATE_TYPE_POLICY,
  } = VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationTracker"
  ) ?? { updatesNotApplied: [], setFinishedUpdates: () => {} };

  const daoPolicy = treasuryDaoID
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;
  updatesNotApplied
    .filter((update) => update.type === UPDATE_TYPE_POLICY)
    .forEach((update) => {
      if (update.checkPolicy(daoPolicy)) {
        finishedUpdates[update.id] = true;
      }
    });
  setFinishedUpdates(finishedUpdates);
}

return {
  checkIfPolicyIsUpToDate,
};
