return (
  <div>
    <Widget
      src={`${REPL_TREASURY}/widget/components.SidebarAndMainLayout`}
      props={{
        leftNavbarOptions: [
          {
            icon: <i class="bi bi-envelope"></i>,
            title: "Pending Requests",
            href: `${REPL_TREASURY}/widget/pages.operations.payments.PendingRequests`,
            props: {},
          },
          {
            icon: <i class="bi bi-clock-history"></i>,
            title: "History",
            href: `${REPL_TREASURY}/widget/pages.operations.payments.History`,
            props: {},
          },
          {
            icon: <i class="bi bi-person-vcard"></i>,
            title: "Payment Recipients",
            href: `${REPL_TREASURY}/widget/pages.operations.payments.PaymentRecipients`,
            props: {},
          },
        ],
      }}
    />
  </div>
);
