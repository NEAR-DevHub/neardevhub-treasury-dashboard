function getPolicy(instance) {
  const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
  return {
    daoPolicy: treasuryDaoID
      ? Near.view(treasuryDaoID, "get_policy", {})
      : null,
    treasuryDaoID,
  };
}

function checkIfPolicyIsUpToDate(instance) {
  const {
    updatesNotAppliedForInstance,
    finishedUpdates,
    setFinishedUpdates,
    UPDATE_TYPE_POLICY,
  } = VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationTracker"
  ) ?? { updatesNotAppliedForInstance: () => [], setFinishedUpdates: () => {} };

  const updatesNotApplied = updatesNotAppliedForInstance(instance);
  const { daoPolicy } = getPolicy(instance);
  updatesNotApplied
    .filter((update) => update.type === UPDATE_TYPE_POLICY)
    .forEach((update) => {
      if (update.checkPolicy(daoPolicy)) {
        finishedUpdates[update.id] = true;
      }
    });
  setFinishedUpdates(finishedUpdates);
}

function applyPolicyUpdate(instance, update) {
  const { encodeToMarkdown } = VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
  ) || {
    encodeToMarkdown: () => {},
  };

  const { daoPolicy, treasuryDaoID } = getPolicy(instance);
  const { updatedPolicy, description } =
    update.getUpdatedPolicyProposal(daoPolicy);
  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: {
            ChangePolicy: {
              policy: updatedPolicy,
            },
          },
        },
      },
      gas: 200000000000000,
      deposit,
    },
  ]);
}

return {
  checkIfPolicyIsUpToDate,
  applyPolicyUpdate,
};
