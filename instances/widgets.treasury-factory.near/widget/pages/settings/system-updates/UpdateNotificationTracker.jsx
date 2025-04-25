const updateRegistry =
  VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateRegistry"
  ) ?? [];

const STORAGE_KEY_FINISHED_UPDATES = "FINISHED_UPDATES";
const UPDATE_TYPE_WEB4_CONTRACT = "Web4 Contract";
const UPDATE_TYPE_WIDGET = "Widgets";
const UPDATE_TYPE_POLICY = "Policy";
const UPDATE_TYPE_DAO_CONTRACT = "DAO contract";

const finishedUpdates = JSON.parse(
  Storage.get(STORAGE_KEY_FINISHED_UPDATES) ?? "{}"
);

const updatesNotApplied = updateRegistry.filter(
  (update) => finishedUpdates[update.id] === undefined
);

const appliedUpdates = updateRegistry.filter(
  (update) => finishedUpdates[update.id] !== undefined
);

return {
  appliedUpdates,
  updatesNotApplied,
  hasUpdates: updatesNotApplied.length > 0,
  UPDATE_TYPE_WEB4_CONTRACT,
  UPDATE_TYPE_WIDGET,
  UPDATE_TYPE_POLICY,
  UPDATE_TYPE_DAO_CONTRACT,
  finishedUpdates,
  setFinishedUpdates: (finishedUpdates) => {
    Storage.set(STORAGE_KEY_FINISHED_UPDATES, JSON.stringify(finishedUpdates));
  },
};
