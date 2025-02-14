const { type, text } = props;

const typeMapper = {
  info: { icon: "bi-info-circle", color: "#555555", bg: "#F4F4F4" },
  alert: { icon: "bi-exclamation-triangle", color: "#B17108", bg: "#FF9E001A" },
};

const Containet = styled.div`
  display: flex;
  padding: 10px 15px;
  gap: 10px;
  border-radius: 15px;
  align-items: center;
  background: ${typeMapper[type].bg};
  color: ${typeMapper[type].color};

  i {
    font-size: 20px;
  }

  small {
    font-size: 12px;
    line-height: 15px;
  }

  a {
    color: #01bf7a !important;
  }
`;

return (
  <Containet>
    <i className={`bi ${typeMapper[type].icon}`} />
    <small>{text}</small>
  </Containet>
);
