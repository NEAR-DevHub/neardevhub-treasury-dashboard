const { getAllColorsAsCSSVariables } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
) || { getAllColorsAsCSSVariables: () => {} };

const ThemeContainer = styled.div`
  --theme-color: rgba(44, 62, 80, 1);
  --theme-bg-color: #f4f4f4;
  --page-header-color: rgba(54, 61, 69, 1);
  --link-inactive-color: white;
  --link-active-color: white;
  --border-color: rgba(226, 230, 236, 1);
  --light-grey-color: rgba(185, 185, 185, 1);

  ${() => getAllColorsAsCSSVariables(false, "#007bff")}

  a.btn-primary {
    color: white !important;
  }
  a.btn-primary.active {
    color: white !important;
  }
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;

    &:active,
    &:focus {
      border: 0;
    }

    &:hover {
      text-decoration: none;
      color: black !important;
      background-color: #e6e6e6;
    }
  }

  .btn-outline-plain {
    border: 1px solid #e2e6ec;
    background-color: transparent;
    color: black !important;

    &:active,
    &:focus {
      border: 1px solid #e2e6ec;
    }
  }

  .btn-primary {
    background-color: #007bff;
    border: 1px solid #0062cc;

    &:hover {
      color: white !important;
      background-color: #0069d9;
    }
  }

  .nav a {
    text-decoration: none;
    color: var(--link-inactive-color) !important;
    &.active {
      color: var(--link-active-color) !important;
    }

    &:hover {
      color: var(--link-active-color) !important;
    }
  }

  .page-header {
    color: var(--page-header-color);
  }

  .text-light-grey {
    color: var(--light-grey-color);
  }

  .text-muted {
    color: var(--dark-grey-color);
  }

  .text-md {
    font-size: 15px;
  }

  .primary-text-color {
    color: var(--theme-color);
  }
`;

return { ThemeContainer };
