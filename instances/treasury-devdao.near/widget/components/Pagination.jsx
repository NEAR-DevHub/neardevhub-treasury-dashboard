const onNextClick = props.onNextClick ?? (() => {});
const onPrevClick = props.onPrevClick ?? (() => {});
const onRowsChange = props.onRowsChange ?? (() => {});
const totalPages = props.totalPages;
const totalLength = props.totalLength;
const rowsPerPage = props.rowsPerPage;
const page = props.currentPage;

const currentPage = page + 1;
const currenPageLimit =
  totalLength <= currentPage * rowsPerPage
    ? totalLength
    : currentPage * rowsPerPage;

return (
  <div
    className="d-flex justify-content-between align-items-center gap-2 flex-wrap"
    style={{ color: "#555555" }}
  >
    <div className="d-flex gap-2 align-items-center">
      Rows per Page:
      <select
        onChange={(e) => onRowsChange(e.target.value)}
        value={rowsPerPage}
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={30}>30</option>
      </select>
    </div>
    <div className="d-flex gap-2 align-items-center">
      Showing: {currentPage * rowsPerPage - rowsPerPage + 1} - {currenPageLimit}{" "}
      of {totalLength}
      <button
        className="btn-outline-plain"
        disabled={page === 0}
        onClick={onPrevClick}
      >
        <i class="bi bi-arrow-left h5"></i>
      </button>
      <button
        className="btn-outline-plain"
        disabled={currentPage === totalPages}
        onClick={onNextClick}
      >
        <i class="bi bi-arrow-right h5"></i>
      </button>
    </div>
  </div>
);
