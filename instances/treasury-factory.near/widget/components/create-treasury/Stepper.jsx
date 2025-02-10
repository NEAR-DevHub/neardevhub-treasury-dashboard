const { activeStep, steps } = props;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  border-radius: 15px;
  padding: 20px;
  gap: 15px;
  background: white;
  border: 1px solid #e2e6ec;

  small {
    line-height: 16px;
  }
`;

const Step = styled.div`
  height: 4px;
  border-radius: 4px;
  background: #e2e6ec;
  width: 100%;
`;

return (
  <>
    <div className="d-flex gap-1 justify-content-between mb-2 align-items-center">
      {steps.map((_step, i) => (
        <Step
          key={i}
          className={parseInt(activeStep) >= i ? "bg-primary" : ""}
        />
      ))}
    </div>
    <Container className="gap-4 d-flex flex-column">
      {steps[parseInt(activeStep)]}
    </Container>
  </>
);
