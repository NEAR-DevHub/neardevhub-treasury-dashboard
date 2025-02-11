const ThemeContainer = styled.div`
  --theme-color: rgba(44, 62, 80, 1);
  --theme-bg-color: #f4f4f4;
  --page-header-color: rgba(54, 61, 69, 1);
  --link-inactive-color: white;
  --link-active-color: white;
  --border-color: rgba(226, 230, 236, 1);
  --light-grey-color: rgba(185, 185, 185, 1);

    --theme-color: rgb(0, 123, 255); 
    --theme-color-dark: rgb(0, 105, 217); 
    --bg-header-color: #2C3E50;
    --bg-page-color: #FFFFFF;
    --bg-system-color: #f4f4f4;
    --text-color: #1B1B18;
    --text-secondary-color: #999999;
    --text-alt-color: #FFFFFF;
    --border-color: rgba(226, 230, 236, 1);
    --grey-01: #1B1B18;
    --grey-02: #555555;
    --grey-03: #B3B3B3;
    --grey-035: #E6E6E6;
    --grey-04: #F4F4F4;
    --grey-05: #F7F7F7;
    --icon-color: #060606;
    --other-primary: #2775C9;
    --other-warning: #B17108;
    --other-green: #3CB179;
    --other-red: #D95C4A;
    --bs-body-bg: var(--bg-page-color);
    --bs-border-color: var(--border-color);
  }  

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
