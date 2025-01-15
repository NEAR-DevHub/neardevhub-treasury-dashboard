const onNextClick = props.onNextClick ?? (() => {});
const onPrevClick = props.onPrevClick ?? (() => {});
const onRowsChange = props.onRowsChange ?? (() => {});
const totalPages = props.totalPages;
const totalLength = props.totalLength;
const paginationOptions = [
  { label: 10, value: 10 },
  { label: 20, value: 20 },
  { label: 30, value: 30 },
];
const rowsPerPage = props.rowsPerPage;
const page = props.currentPage;
const currentPage = page + 1;
const currenPageLimit =
  totalLength <= currentPage * rowsPerPage
    ? totalLength
    : currentPage * rowsPerPage;

return (
  <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap px-3">
    <div className="d-flex gap-2 align-items-center">
      Rows per Page:
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDown`}
        props={{
          options: paginationOptions,
          selectedValue: isNaN(rowsPerPage)
            ? paginationOptions[0]
            : paginationOptions.find((o) => o.value === rowsPerPage),
          onUpdate: ({ value }) => onRowsChange(value),
        }}
      />
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
