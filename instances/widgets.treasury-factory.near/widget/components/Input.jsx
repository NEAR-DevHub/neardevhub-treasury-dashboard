const TextInput = ({
  className,
  format,
  inputProps: { className: inputClassName, ...inputProps },
  key,
  label,
  multiline,
  onChange,
  debounceTimeout,
  placeholder,
  type,
  value,
  skipPaddingGap,
  style,
  error,
  ...otherProps
}) => {
  onChange = typeof onChange === "function" ? onChange : () => {};
  State.init({
    data: "",
    error: error,
  });

  function convertToString(value) {
    return typeof value === "number" ? value.toFixed() : value ?? "";
  }

  useEffect(() => {
    if (value !== state.data) {
      State.update({ data: value });
    }
  }, [value]);

  useEffect(() => {
    const inputError = "";
    if (value !== state.data) {
      const isNumeric = inputProps.inputmode === "numeric";
      let inputValue = state.data;
      // check for input number error (since type: number doesn't work on firefox/safari)
      if (isNumeric) {
        if (!inputValue) {
          return;
        }
        inputValue = convertToString(state.data).replace(/,/g, "");
        let isValidInteger = /^[1-9][0-9]*$/.test(inputValue);
        if (!isValidInteger) {
          inputError = "Please enter the nearest positive whole number.";
        }

        State.update({ error: inputError });
      }
      const handler = setTimeout(() => {
        onChange({ target: { value: inputValue }, error: inputError });
      }, debounceTimeout || 30);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [state.data]);

  useEffect(() => {
    if (error !== state.error) {
      State.update({ error: error });
    }
  }, [error]);

  const typeAttribute =
    type === "text" ||
    type === "password" ||
    type === "number" ||
    type === "date"
      ? type
      : "text";

  const isValid = () => {
    if (!state.data || state.data.length === 0) {
      return !inputProps.required;
    } else if (inputProps.min && inputProps.min > state.data?.length) {
      return false;
    } else if (inputProps.max && inputProps.max < state.data?.length) {
      return false;
    } else if (
      inputProps.allowCommaAndSpace === false &&
      /^[^,\s]*$/.test(state.data) === false
    ) {
      return false;
    } else if (
      inputProps.validUrl === true &&
      /^(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/.test(
        state.data
      ) === false
    ) {
      return false;
    }
    return true;
  };

  const renderedLabels = [
    (label?.length ?? 0) > 0 ? (
      <span className="d-inline-flex gap-1 text-wrap">
        <span>{label}</span>

        {inputProps.required ? <span className="text-danger">*</span> : null}
      </span>
    ) : null,

    format === "markdown" ? (
      <i class="bi bi-markdown text-secondary" title="Markdown" />
    ) : null,

    format === "comma-separated" ? (
      <span
        className={`d-inline-flex align-items-center ${
          isValid() ? "text-secondary" : "text-danger"
        }`}
        style={{ fontSize: 12 }}
      >
        {format}
      </span>
    ) : null,

    (inputProps.max ?? null) !== null && type !== "date" ? (
      <span
        className={`d-inline-flex ${
          isValid() ? "text-secondary" : "text-danger"
        }`}
        style={{ fontSize: 12 }}
      >{`${state.data?.length ?? 0} / ${inputProps.max}`}</span>
    ) : null,
  ].filter((label) => label !== null);

  const onKeyDown = props.onKeyDown ?? (() => {});

  const getFormattedData = useCallback(() => {
    if (inputProps.inputmode === "numeric") {
      const number = parseFloat(convertToString(state.data).replace(/,/g, ""));
      if (!isNaN(number)) {
        // Format the number for display
        return number.toLocaleString("en-US");
      }
    }
    return state.data;
  }, [state.data]);

  return (
    <div
      className={[
        "d-flex flex-column flex-1 align-items-start justify-content-evenly",
        skipPaddingGap ? "" : "gap-1 p-2",
        className ?? "",
      ].join(" ")}
      style={style}
      {...otherProps}
    >
      {renderedLabels.length > 0 ? (
        <span
          className="d-flex justify-content-between align-items-center gap-3 w-100"
          id={key}
        >
          {renderedLabels.map((label) => label)}
        </span>
      ) : null}

      {!multiline ? (
        <div className="w-100">
          <div className="input-group">
            {inputProps.prefix && (
              <span className="input-group-text bg-dropdown border-end-0">
                {inputProps.prefix}
              </span>
            )}
            <input
              key={key}
              aria-describedby={key}
              data-testid={key}
              aria-label={label}
              className={
                inputClassName ||
                `form-control border ${
                  inputProps.prefix ? "border-start-0" : ""
                }`
              }
              type={typeAttribute}
              maxLength={type !== "date" ? inputProps.max : undefined}
              value={getFormattedData()}
              onChange={(e) => State.update({ data: e.target.value })}
              onBlur={(e) => {
                if (typeof onBlur === "function") {
                  onBlur({ target: { value: e.target.value } });
                }
              }}
              onKeyDown={onKeyDown}
              {...{ placeholder, ...inputProps }}
            />
          </div>
          {state.error && (
            <div style={{ color: "red" }} className="text-sm">
              {state.error}
            </div>
          )}
        </div>
      ) : (
        <textarea
          aria-describedby={key}
          data-testid={key}
          aria-label={label}
          className={["form-control border", inputClassName].join(" ")}
          placeholder={
            placeholder + (inputProps.required ? " ( required )" : "")
          }
          style={{ resize: inputProps.resize ?? "vertical" }}
          type={typeAttribute}
          maxLength={inputProps.max}
          value={state.data}
          onChange={(e) => State.update({ data: e.target.value })}
          onBlur={(e) => {
            if (typeof onBlur === "function") {
              onBlur({ target: { value: e.target.value } });
            }
          }}
          onKeyDown={onKeyDown}
          {...{ placeholder, ...inputProps }}
        />
      )}
    </div>
  );
};

return TextInput(props);
