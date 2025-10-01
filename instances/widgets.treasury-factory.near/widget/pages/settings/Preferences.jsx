const timeFormats = [
  {
    label: "12-hour (1:00 PM)",
    value: "12-hour",
  },
  {
    label: "24-hour (13:00)",
    value: "24-hour",
  },
];

const Container = styled.div`
  font-size: 14px;

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid var(--border-color);
  }

  label {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .form-switch {
    display: inline-block;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .form-switch i {
    position: relative;
    display: inline-block;
    margin-right: 0.5rem;
    width: 46px;
    height: 26px;
    background-color: var(--bg-page-color);
    border-radius: 23px;
    vertical-align: text-bottom;
    transition: all 0.3s linear;
  }
  .form-switch i::before {
    top: -1px;
    left: -1px;
    content: "";
    position: absolute;
    left: 0;
    width: 42px;
    height: 24px;
    background-color: var(--grey-03);
    border-radius: 11px;
    transform: translate3d(2px, 2px, 0) scale3d(1, 1, 1);
    transition: all 0.25s linear;
  }
  .form-switch i::after {
    content: "";
    position: absolute;
    left: 0;
    width: 22px;
    height: 22px;
    background-color: var(--border-color);
    border-radius: 11px;
    box-shadow: 0 2px 2px rgba(0, 0, 0, 0.24);
    transform: translate3d(2px, 2px, 0);
    transition: all 0.2s ease-in-out;
  }
  .form-switch:active i::after {
    width: 28px;
    transform: translate3d(2px, 2px, 0);
  }
  .form-switch:active input:checked + i::after {
    transform: translate3d(16px, 2px, 0);
  }
  .form-switch input {
    display: none;
  }
  .form-switch input:checked + i {
    background-color: var(--theme-color);
  }
  .form-switch input:checked + i::before {
    transform: translate3d(18px, 2px, 0) scale3d(0, 0, 0);
  }
  .form-switch input:checked + i::after {
    transform: translate3d(22px, 2px, 0);
  }
`;

const [timezones, setTimezones] = useState([]);
const [selectedTimezone, setSelectedTimezone] = useState(null);
const [useLocation, setUseLocation] = useState(false);
const [timeFormat, setTimeFormat] = useState("12-hour");
const [savedPreferences, setSavedPreferences] = useState({});
const [showToast, setShowToast] = useState(false);

const storedPreferences = JSON.parse(
  Storage.get("USER_TIMEZONE_PREFERENCES") || "{}"
);

useEffect(() => {
  asyncFetch("${REPL_BACKEND_API}/timezones").then((res) => {
    const data = res.body;
    setTimezones(data);
  });
}, []);

useEffect(() => {
  setSavedPreferences(storedPreferences);

  if (storedPreferences.timezone) {
    setSelectedTimezone(storedPreferences.timezone);
  }
  if (storedPreferences.useLocation !== undefined) {
    setUseLocation(storedPreferences.useLocation);
  }
  if (storedPreferences.timeFormat) {
    setTimeFormat(storedPreferences.timeFormat);
  }
}, [storedPreferences]);

// Check if current state differs from saved preferences
const hasChanges = () => {
  const currentState = {
    timezone: selectedTimezone,
    useLocation: useLocation,
    timeFormat: timeFormat,
  };

  const timezoneChanged =
    JSON.stringify(currentState.timezone || null) !==
    JSON.stringify(savedPreferences.timezone || null);
  const useLocationChanged =
    currentState.useLocation !== (savedPreferences.useLocation || false);
  const timeFormatChanged =
    currentState.timeFormat !== (savedPreferences.timeFormat || "12-hour");

  return timezoneChanged || useLocationChanged || timeFormatChanged;
};

const detectUserTimezone = () => {
  try {
    const d = new Date();
    const offsetMinutes = d.getTimezoneOffset();

    // Convert offset to hours (offset is negative for positive timezones)
    const offsetHours = -offsetMinutes / 60;

    // Find timezone that matches this offset
    const matchingTimezone = timezones.find((tz) => {
      // Parse UTC offset from timezone string like "UTC-11:00"
      const utcMatch = tz.utc.match(/UTC([+-]\d{1,2}):?(\d{2})?/);
      if (utcMatch) {
        const sign = utcMatch[1].charAt(0) === "+" ? 1 : -1;
        const hours = parseInt(utcMatch[1].substring(1));
        const minutes = utcMatch[2] ? parseInt(utcMatch[2]) : 0;
        const totalOffset = sign * (hours + minutes / 60);
        return Math.abs(totalOffset - offsetHours) < 0.1; // Allow small tolerance
      }
      return false;
    });

    if (matchingTimezone) {
      setSelectedTimezone(matchingTimezone);
    } else {
      // Fallback to UTC if no match found
      const utcTimezone =
        timezones.find((tz) => tz.name === "UTC") || timezones[0];
      if (utcTimezone) {
        setSelectedTimezone(utcTimezone);
      }
    }
  } catch (error) {
    console.error("Failed to detect timezone:", error);
    // Fallback to UTC
    const utcTimezone =
      timezones.find((tz) => tz.name === "UTC") || timezones[0];
    if (utcTimezone) {
      setSelectedTimezone(utcTimezone);
    }
  }
};

// Auto-detect timezone when useLocation is enabled
useEffect(() => {
  if (useLocation && !selectedTimezone) {
    detectUserTimezone();
  }
}, [useLocation]);

const handleTimezoneSelect = (timezone) => {
  setSelectedTimezone(timezone);
};

const handleUseLocationToggle = (checked) => {
  setUseLocation(checked);

  if (checked) {
    detectUserTimezone();
  }
};

const handleTimeFormatSelect = (format) => {
  setTimeFormat(format);
};

const handleCancel = () => {
  // Reset to saved preferences
  if (savedPreferences.timezone) {
    setSelectedTimezone(savedPreferences.timezone);
  } else {
    setSelectedTimezone(null);
  }

  if (savedPreferences.useLocation !== undefined) {
    setUseLocation(savedPreferences.useLocation);
  } else {
    setUseLocation(false);
  }

  if (savedPreferences.timeFormat) {
    setTimeFormat(savedPreferences.timeFormat);
  } else {
    setTimeFormat("12-hour");
  }
};

const handleSaveChanges = () => {
  const newPreferences = {
    timezone: selectedTimezone,
    useLocation: useLocation,
    timeFormat: timeFormat,
  };

  // Save all preferences to storage
  Storage.set("USER_TIMEZONE_PREFERENCES", JSON.stringify(newPreferences));

  // Update saved preferences state
  setSavedPreferences(newPreferences);

  // Show toast notification
  setShowToast(true);

  // Auto-hide toast after 3 seconds
  setTimeout(() => {
    setShowToast(false);
  }, 3000);
};

return (
  <Container>
    <div className="card rounded-4 py-3" style={{ maxWidth: "50rem" }}>
      <div className="card-title px-3 pb-3">Preferences</div>
      <div className="px-3 py-1  d-flex flex-column gap-3">
        <div className="d-flex flex-column gap-1">
          <label>Time Format</label>
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDown`}
            props={{
              options: timeFormats,
              selectedValue:
                timeFormats.find((f) => f.value === timeFormat) ||
                timeFormats[0],
              onUpdate: ({ value }) => handleTimeFormatSelect(value),
            }}
          />
        </div>
        <div className="d-flex align-items-center justify-content-between gap-2">
          Set timezone automatically using your location{" "}
          <label className="form-switch">
            <input
              type="checkbox"
              checked={useLocation}
              onChange={(e) => handleUseLocationToggle(e.target.checked)}
            />
            <i data-testid="use-location-checkbox"></i>
          </label>
        </div>
        <div>
          <label>Timezone</label>
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SearchSelectorModal`}
            props={{
              options: timezones,
              modalTitle: "Select Timezone",
              dataTestId: "select-timezone-dropdown",
              selectedElement: selectedTimezone ? (
                <div className="d-flex align-items-center gap-2">
                  ({selectedTimezone.utc}) {selectedTimezone.value}
                </div>
              ) : (
                ""
              ),
              dropdownLabel: "Select Timezone",
              enableSearch: true,
              onSelect: handleTimezoneSelect,
              searchPlaceholder: "Search timezones",
              renderOption: (option) => (
                <div className="d-flex align-items-center gap-2">
                  ({option.utc}) {option.value}
                </div>
              ),
              disabled: useLocation, // Disable when using location
            }}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 align-items-center">
          <button className="btn btn-outline-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="btn theme-btn"
            onClick={handleSaveChanges}
            disabled={!hasChanges()}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>

    {/* Toast Notification */}
    {showToast && (
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className="toast show">
          <div className="toast-header px-2">
            <strong className="me-auto">Just Now</strong>
            <i
              className="bi bi-x-lg h6 mb-0 cursor-pointer"
              onClick={() => setShowToast(false)}
            ></i>
          </div>
          <div className="toast-body">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-check2 h3 mb-0 success-icon"></i>
              <div>
                <div>Preferences saved successfully!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </Container>
);
