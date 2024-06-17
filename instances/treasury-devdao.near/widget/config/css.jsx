const Theme = styled.div`
  --theme-color: rgba(44, 62, 80, 1);
  --theme-bg-color: rgba(226, 230, 236, 1);
  --page-header-color: rgba(54, 61, 69, 1);
  --text-color: white;
  --link-inactive-color: white;
  --link-active-color: white;
  --border-color: rgba(226, 230, 236, 1);

  a {
    color: var(--link-inactive-color) !important;
    &.active {
      color: var(--link-active-color) !important;
      font-weight: 700 !important;
    }

    &:hover {
      text-decoration: none;
      color: var(--link-active-color) !important;
      font-weight: 700 !important;
    }
  }

  button {
    &.primary {
      background-color: var(--theme-color);
      color: var(--text-color);
    }
  }

  .page-header {
    color: var(--page-header-color);
  }
`;

return { Theme };
