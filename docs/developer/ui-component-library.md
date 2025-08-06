UI component library
====================

To ensure a consistent look and feel across the application, developers should reuse standard components, and avoid applying specific styling on pages.

# Implementing components

An example of a reusable component is the [Modal](../../instances/treasury-devdao.near/widget/lib/modal.jsx).


To implement a reusable component, we can create a function that takes `children` as a parameter. Here's an example of the `ModalFooter` component:

```jsx
const ModalFooter = ({ children }) => 
  <div className="modalfooter d-flex gap-2 align-items-center justify-content-end mt-2">
    {children}
  </div>
;
```

We can then use it in another widget like this:

```jsx
const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal");

return <Modal>
  <ModalHeader>
    Modal title
  </ModalHeader>
  <ModalContent>
    <p>
      The modal message
    </p>                
  </ModalContent>
  <ModalFooter>
    <button>Dismiss</button>
  </ModalFooter>
</Modal>;
```

This way, we can have custom jsx inside the resuable component. The styles and classes of the reusable component will be applied to the custom jsx content.

# Theme Colors

The application supports light and dark themes with consistent color variables. To ensure your components properly support both themes, use the `getAllColorsAsObject` function from `lib.common`.

## Using Theme Colors

```jsx
const { getAllColorsAsObject } = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

// Get theme configuration from treasury DAO
const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = config ? JSON.parse(atob(config.metadata ?? "")) : {};
const isDarkTheme = metadata.theme === "dark";
const primaryColor = metadata?.primaryColor || themeColor || "#01BF7A";

// Get all theme colors as an object
const colors = getAllColorsAsObject(isDarkTheme, primaryColor);

// Use in styled components
const StyledContainer = styled.div`
  ${JSON.stringify(colors)
    .replace(/[{}]/g, "")
    .replace(/,/g, ";")
    .replace(/"/g, "")}
  
  .my-component {
    background-color: var(--bg-page-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }
`;
```

## Available Color Variables

| Variable | Description | Light Theme | Dark Theme |
|----------|-------------|-------------|------------|
| `--theme-color` | Primary theme color | User defined or #01BF7A | User defined or #01BF7A |
| `--theme-color-dark` | Darker variant of theme color | Calculated | Calculated |
| `--bg-header-color` | Header background | #2C3E50 | #222222 |
| `--bg-page-color` | Page background | #FFFFFF | #222222 |
| `--bg-system-color` | System/secondary background | #f4f4f4 | #131313 |
| `--text-color` | Primary text color | #1B1B18 | #CACACA |
| `--text-secondary-color` | Secondary text color | #999999 | #878787 |
| `--text-alt-color` | Alternative text (always white) | #FFFFFF | #FFFFFF |
| `--border-color` | Border color | rgba(226, 230, 236, 1) | #3B3B3B |
| `--grey-01` through `--grey-05` | Gray scale colors | Various | Various |
| `--icon-color` | Icon color | #060606 | #CACACA |
| `--other-primary` | Secondary brand color | #2775C9 | #2775C9 |
| `--other-warning` | Warning color | #B17108 | #B17108 |
| `--other-green` | Success/green color | #3CB179 | #3CB179 |
| `--other-green-light` | Light green background | #3CB1791A | #3CB1791A |
| `--other-red` | Error/danger color | #D95C4A | #D95C4A |

## Best Practices

1. **Always use CSS variables** instead of hardcoded colors to ensure proper theme support
2. **Import theme colors** at the component level using `getAllColorsAsObject`
3. **Apply colors to styled components** using the JSON stringify technique shown above
4. **Test your components** in both light and dark themes
5. **Use semantic color variables** (e.g., `--text-color` instead of `--grey-01`) when possible
