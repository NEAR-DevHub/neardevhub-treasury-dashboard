const updateRegistry =
  VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateRegistry"
  ) ?? [];

const STORAGE_KEY_FINISHED_UPDATES = "FINISHED_UPDATES";
const STORAGE_KEY_PROPOSED_UPDATES = "PROPOSED_UPDATES";
const UPDATE_TYPE_WEB4_CONTRACT = "Web4 Contract";
const UPDATE_TYPE_WIDGET = "Widgets";
const UPDATE_TYPE_POLICY = "Policy";
const UPDATE_TYPE_DAO_CONTRACT = "DAO contract";

const finishedUpdates = JSON.parse(
  Storage.get(STORAGE_KEY_FINISHED_UPDATES) ?? "{}"
);

const proposedUpdates = JSON.parse(
  Storage.get(STORAGE_KEY_PROPOSED_UPDATES) ?? "{}"
);

const updatesNotAppliedForInstance = (instance) =>
  updateRegistry
    .filter((update) => finishedUpdates[update.id] === undefined)
    .filter(
      (update) =>
        update.instances === undefined || update.instances.includes(instance)
    )
    .map((update) => ({
      ...update,
      hasActiveProposal: proposedUpdates[update.id] !== undefined,
    }));

const appliedUpdates = updateRegistry.filter(
  (update) => finishedUpdates[update.id] !== undefined
);

return {
  appliedUpdates,
  updatesNotAppliedForInstance,
  proposedUpdates,
  instanceHasUpdates: (instance) => {
    const updatesNotApplied = updatesNotAppliedForInstance(instance);
    return (
      updatesNotApplied.length > 0 &&
      updatesNotApplied.filter((update) => update.hasActiveProposal).length !==
        updatesNotApplied.length
    );
  },
  UPDATE_TYPE_WEB4_CONTRACT,
  UPDATE_TYPE_WIDGET,
  UPDATE_TYPE_POLICY,
  UPDATE_TYPE_DAO_CONTRACT,
  finishedUpdates,
  setFinishedUpdates: (finishedUpdates) => {
    Storage.set(STORAGE_KEY_FINISHED_UPDATES, JSON.stringify(finishedUpdates));
  },
  setProposedUpdates: (proposedUpdates) => {
    Storage.set(STORAGE_KEY_PROPOSED_UPDATES, JSON.stringify(proposedUpdates));
  },
};
