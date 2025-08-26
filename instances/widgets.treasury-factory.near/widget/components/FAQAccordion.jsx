const { question, answer, isOpen, onToggle, isLast } = props;

const Container = styled.div`
  .faq-question {
    cursor: pointer;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .faq-question.expanded {
    border-bottom: none;
    padding-bottom: 1rem !important;
  }

  .faq-answer {
    color: #999999 !important;
    max-height: 0;
    overflow: hidden;
  }

  .faq-answer p {
    margin-bottom: 0px !important;
  }

  .faq-answer ul {
    margin-bottom: 0px !important;
  }

  .faq-answer.expanded {
    max-height: 500px;
    padding-bottom: 0.5rem;
  }

  .faq-question.last-child {
    border-bottom: none !important;
    padding-bottom: 0px;
  }
`;

return (
  <Container>
    <div
      className={`faq-question d-flex justify-content-between align-items-center ${
        isOpen ? "expanded" : ""
      } ${isLast ? "last-child" : ""}`}
      onClick={onToggle}
    >
      <div className="fw-bold">{question}</div>
      <div className={`bi bi-chevron-${isOpen ? "up" : "down"}`}></div>
    </div>
    <div className={`faq-answer ${isOpen ? "expanded" : ""}`}>
      <Markdown
        style={{
          color: "var(--text-secondary) !important",
        }}
        text={`
${answer}
`}
        syntaxHighlighterProps={{
          wrapLines: true,
        }}
      />
    </div>
  </Container>
);
