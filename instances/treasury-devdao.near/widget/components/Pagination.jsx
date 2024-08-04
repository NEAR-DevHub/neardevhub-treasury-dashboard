const onNextClick = props.onNextClick ?? (() => {});
const onPrevClick = props.onPrevClick ?? (() => {});
const onRowsChange = props.onRowsChange ?? (() => {});
const totalCount = props.totalCount;
const rows = props.rowsPerPage;

const [currentPage, setCurrentPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(rows);

useEffect(() => {
  if (rows !== rowsPerPage) {
    onRowsChange(rowsPerPage);
  }
}, []);

return (
  <div className="d-flex justify-content-between align-items-center">
    <div className="d-flex gap-2 align-items-center">
      Rows per Page:
      <select
        onChange={(e) => setRowsPerPage(e.target.value)}
        value={rowsPerPage}
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={30}>30</option>
      </select>
    </div>
    <div className="d-flex gap-2 align-items-center">
      Showing: {currentPage * rowsPerPage - rowsPerPage + 1} -
      {currentPage * rowsPerPage} of {totalCount}
      <div onClick={onPrevClick}>
        <i class="bi bi-arrow-left-square"></i>
      </div>
      <div onClick={onNextClick}>
        <i class="bi bi-arrow-right-square"></i>
      </div>
    </div>
  </div>
);
