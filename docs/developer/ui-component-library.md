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
