const nanosecondsTimestamp = props.timestamp;
const millisecondsTimestamp = Math.floor(nanosecondsTimestamp / 1e6);
const isProposalDetailsPage = props.isProposalDetailsPage;
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

const formattedUTC = date.toLocaleString("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
  timeZoneName: "short",
});

return isProposalDetailsPage ? (
  <div>{formattedUTC}</div>
) : (
  <div className="text-left">
    <div className="bold">{formattedTime}</div>
    <div className="text-secondary text-sm">{formattedDate}</div>
  </div>
);
