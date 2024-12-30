const config = Near.view("${REPL_TREASURY}", "get_config");
const metadata = JSON.parse(atob(config.metadata ?? ""));

const Theme = styled.div`
  --theme-color: ${metadata.primaryColor ?? "#F76218"};
`;

return { Theme };
