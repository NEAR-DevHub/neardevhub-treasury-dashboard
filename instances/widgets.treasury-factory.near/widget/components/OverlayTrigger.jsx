const { instance } = props;

if (!instance) {
  return <></>;
}
const { getAllColorsAsCSSVariables } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || { getAllColorsAsCSSVariables: () => {} };
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = JSON.parse(atob(config.metadata ?? ""));
const rootClose = props.rootClose ?? true;
const containerClass = props.containerClass;
const isDarkTheme = metadata.theme === "dark";

const showTimer = 250;
const hideTimer = 300;

const handleOnMouseEnter = () => {
  clearTimeout(state.debounce);
  State.update({
    debounce: setTimeout(() => State.update({ show: true }), showTimer),
  });
};
const handleOnMouseLeave = () => {
  clearTimeout(state.debounce);
  State.update({
    debounce: setTimeout(() => State.update({ show: false }), hideTimer),
  });
};

State.init({
  show: false,
});

const overlayClassName = props.overlayClassName ?? "m-3 p-2 rounded-3 shadow";
const overlayStyle = props.overlayStyle ?? {
  maxWidth: "24em",
  zIndex: 1070,
  backgroundColor: isDarkTheme ? "#222222" : "#FFFFFF",
  color: isDarkTheme ? "#CACACA" : "#1B1B18",
  border: "1px solid " + (isDarkTheme ? "#3B3B3B" : "rgba(226, 230, 236, 1)"),
  fontSize: 13,
};

const ThemeColorsContainer = styled.div`
  ${() => getAllColorsAsCSSVariables(isDarkTheme, "")}
`;

const overlay = (
  <div
    className={overlayClassName}
    style={overlayStyle}
    onMouseEnter={handleOnMouseEnter}
    onMouseLeave={handleOnMouseLeave}
  >
    <ThemeColorsContainer>{props.popup}</ThemeColorsContainer>
  </div>
);

return (
  <OverlayTrigger
    show={state.show}
    trigger={["hover", "focus"]}
    delay={{ show: showTimer, hide: hideTimer }}
    placement="auto"
    overlay={overlay}
    rootClose={rootClose}
  >
    <span
      className={containerClass || "d-inline-block"}
      onMouseEnter={handleOnMouseEnter}
      onMouseLeave={handleOnMouseLeave}
    >
      {props.children}
    </span>
  </OverlayTrigger>
);
