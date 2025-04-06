const updateRegistry =
  VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.systemupdates.UpdateRegistry"
  ) ?? [];

const STORAGE_KEY_FINISHED_UPDATES = "FINISHED_UPDATES";
const UPDATE_TYPE_WEB4_CONTRACT = "Web4 Contract";

const finishedUpdates = JSON.parse(
  Storage.get(STORAGE_KEY_FINISHED_UPDATES) ?? "{}"
);

const updatesNotApplied = updateRegistry.filter(
  (update) => finishedUpdates[update.id] === undefined
);

return {
  updatesNotApplied,
  hasUpdates: updatesNotApplied.length > 0,
  UPDATE_TYPE_WEB4_CONTRACT,
  finishedUpdates,
  setFinishedUpdates: (finishedUpdates) => {
    console.log("setFinishedUpdates", finishedUpdates);
    Storage.set(STORAGE_KEY_FINISHED_UPDATES, JSON.stringify(finishedUpdates));
  },
};
