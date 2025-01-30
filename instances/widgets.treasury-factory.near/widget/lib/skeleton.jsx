const Skeleton = styled.div`
  background: var(--grey-04);
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
`;

const TableSkeleton = ({ numberOfCols, numberOfRows, numberOfHiddenRows }) => {
  const Row = ({ first, body, style, hidden }) => (
    <tr style={style}>
      <td style={{ width: "67px" }}>
        {hidden ? (
          <div style={{ height: body.height, width: body.width }} />
        ) : (
          <Skeleton
            style={{ height: first.height, width: first.width }}
            className="rounded-3"
          />
        )}
      </td>
      {[...Array(numberOfCols)].map(() => (
        <td>
          {hidden ? (
            <div style={{ height: body.height, width: body.width }} />
          ) : (
            <Skeleton
              style={{ height: body.height, width: body.width }}
              className="rounded-3"
            />
          )}
        </td>
      ))}
    </tr>
  );

  return (
    <table className="table">
      <thead>
        <Row
          first={{ height: "18px", width: "18px" }}
          body={{ height: "18px", width: "74px" }}
        />
      </thead>
      <tbody>
        {[...Array(numberOfRows)].map(() => (
          <Row
            style={{ height: "57px" }}
            first={{ height: "24px", width: "32px" }}
            body={{ height: "30px", width: "100%" }}
          />
        ))}
        {[...Array(numberOfHiddenRows)].map(() => (
          <Row
            style={{ height: "57px" }}
            first={{ height: "24px", width: "32px" }}
            body={{ height: "30px", width: "100%" }}
            hidden
          />
        ))}
      </tbody>
    </table>
  );
};

return { Skeleton, TableSkeleton };
