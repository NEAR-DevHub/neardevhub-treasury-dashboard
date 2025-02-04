const accountId = props.accountId;
const profile = props.profile ?? Social.getr(`${accountId}/profile`);
const fast = !!props.fast || (!props.profile && accountId);
const name = profile.name;

const inner = (
  <div className="d-flex flex-row">
    <Widget
      src="mob.near/widget/ProfileImage"
      props={{
        fast,
        profile,
        accountId,
        widgetName,
        style: { height: "2.5em", width: "2.5em", minWidth: "2.5em" },
        className: "me-2",
      }}
    />
    <div className="d-flex flex-column justify-content-center text-truncate lh-sm">
      {name ? (
        <>
          <div className="text-truncate fw-bold">{name}</div>
          <small className="text-truncate text-muted">
            <span>{accountId}</span>
          </small>
        </>
      ) : (
        <div className="text-truncate fw-bold">{accountId}</div>
      )}
    </div>
  </div>
);

return props.tooltip ? (
  <Widget
    src="mob.near/widget/Profile.OverlayTrigger"
    props={{ accountId, children: inner }}
  />
) : (
  inner
);
