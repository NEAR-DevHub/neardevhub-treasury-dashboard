const nanosecondsTimestamp = props.timestamp;
const millisecondsTimestamp = Math.floor(nanosecondsTimestamp / 1e6);

const date = new Date(millisecondsTimestamp);

// Format the date and time
const options = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

// Get formatted date and time
const formattedDate = date
  .toLocaleDateString("en-GB", options)
  .replace(",", "");
const formattedTime = date.toLocaleTimeString("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

return (
  <div className="text-left">
    <div>{formattedDate}</div>
    <div className="text-secondary text-sm">{formattedTime}</div>
  </div>
);
