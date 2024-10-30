const Theme = styled.div`
  --theme-color: rgba(44, 62, 80, 1);
  --theme-bg-color: #f4f4f4;
  --page-header-color: rgba(54, 61, 69, 1);
  --text-color: white;
  --link-inactive-color: white;
  --link-active-color: white;
  --border-color: rgba(226, 230, 236, 1);
  --light-grey-color: rgba(185, 185, 185, 1);
  --dark-grey-color: rgba(103, 103, 103, 1);
  font-family: Inter;

  .btn-outline-plain {
    padding-block: 8px;
    padding-inline: 10px;
    border-radius: 0.375rem;
    border: 1.5px solid #e2e6ec;
    background-color: transparent;
    color: black !important;

    &:hover {
      text-decoration: none;
      color: black !important;
      font-weight: 700 !important;
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

  button {
    &.btn-primary {
      background-color: var(--theme-color);
      color: var(--text-color);
      border: none !important;
      padding-block: 0.7rem !important;
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

return { Theme };
