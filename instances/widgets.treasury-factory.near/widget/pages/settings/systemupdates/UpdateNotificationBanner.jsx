const { hasUpdates } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.systemupdates.UpdateNotificationTracker"
) ?? { hasUpdates: false };

return hasUpdates ? (
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
