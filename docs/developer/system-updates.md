# System Updates: Publishing and Targeting Updates

## Where to Add Updates

All system updates are defined in a single shared UpdateRegistry widget file. To publish or modify updates, edit the following file:

[instances/widgets.treasury-factory.near/widget/pages/settings/system-updates/UpdateRegistry.jsx](../../instances/widgets.treasury-factory.near/widget/pages/settings/system-updates/UpdateRegistry.jsx)

> **Note:** All instances share this UpdateRegistry file. Updates published here will be visible to all instances unless using the `instances` property for targeting specific instances as described below.

The system update functionality allows developers to publish updates that has to be applied and approved manually by treasury administrators (such as contract upgrades, policy changes, or instance app widget changes) to specific treasury instances or to all. This is managed through the `UpdateRegistry` widget and can be tested or previewed using the Playwright test suite.

## How Updates Are Defined

Updates are defined as JavaScript objects in the `UpdateRegistry` widget. Each update record can include the following fields:

- `id` (number): Unique identifier for the update.
- `createdDate` (string): Date of the update in `YYYY-MM-DD` format.
- `version` (string): Version or label for the update (optional).
- `type` (string): Type/category of the update (e.g., "DAO contract").
- `summary` (string): Short summary of the update.
- `details` (string): Detailed description (optional).
- `instances` (array of strings): (Optional) List of instance account IDs that should receive this update. If omitted, the update is shown to all instances.
- `votingRequired` (boolean): Whether a vote is required for this update.

## Example: Publishing an Update for All Instances

```js
return [
  {
    id: 1,
    createdDate: "2025-03-25",
    version: "n/a",
    type: "DAO contract",
    summary: "Update to latest sputnik-dao contract",
    details: "",
    votingRequired: true,
  }
];
```

## Example: Publishing an Update for Specific Instances

```js
return [
  {
    id: 1,
    createdDate: "2025-03-25",
    version: "n/a",
    type: "DAO contract",
    summary: "Update to latest sputnik-dao contract",
    details: "",
    instances: ["infinex.near", "treasury-testing.near"],
    votingRequired: true,
  }
];
```

In this example, only the specified instances will see the update notification.

## Update Types

The following update types are supported. Set the `type` field in your update object to one of these string values:

### 1. Web4 Contract (`"Web4 Contract"`)
**Description:** Used to upgrade the underlying Web4 smart contract for the treasury instance to the latest version. Applying this update triggers a self-upgrade of the contract.
**Example:**
```js
{
  id: 1,
  createdDate: "2025-05-02",
  type: "Web4 Contract",
  summary: "Upgrade Web4 contract to the latest version",
  details: "This update will upgrade your Web4 contract to the latest release from the factory.",
  votingRequired: false
}
```

### 2. Widgets (`"Widgets"`)
**Description:** Updates the main application widget (typically `app.jsx`) to the latest version from the reference account. Ensures the UI and logic are up-to-date with the latest features and bug fixes.
**Example:**
```js
{
  id: 2,
  createdDate: "2025-05-02",
  type: "Widgets",
  summary: "Update app.jsx widget",
  details: "This update will synchronize your app widget with the latest version from the reference implementation.",
  votingRequired: false
}
```

### 3. Policy (`"Policy"`)
**Description:** Updates that change the DAO policy, such as voting rules, roles, or permissions. Applying this update creates a proposal to change the policy on the DAO contract.
**Example:**
```js
{
  id: 3,
  createdDate: "2025-05-02",
  type: "Policy",
  summary: "Update DAO policy",
  details: "This update proposes changes to the DAO policy, such as new voting thresholds or role assignments.",
  votingRequired: true
}
```

### 4. DAO contract (`"DAO contract"`)
**Description:** Upgrades the DAO contract itself (e.g., to a new version of Sputnik DAO). May involve deploying new contract code or migrating state.
**Example:**
```js
{
  id: 4,
  createdDate: "2025-05-02",
  type: "DAO contract",
  summary: "Upgrade DAO contract to latest Sputnik version",
  details: "This update will upgrade your DAO contract to the latest supported version.",
  votingRequired: true
}
```

**How to use these types:**
When creating an update in the UpdateRegistry, set the `type` field to one of the supported string values listed above. If you need a different type, you'll have to add support for it first. The system will handle each type appropriately, showing the correct UI and triggering the right actions (such as contract upgrade, widget update, or policy proposal).

For more details or to see usage in tests, check the Playwright test cases for system updates, which demonstrate publishing and applying each type.

## How System Updates Work for Users

When a system update is published, users may see a notification banner or badge indicating that a new update is available for their treasury instance. This is designed to help administrators and users stay informed about important changes, such as contract upgrades or policy updates.

### How Update Status is Tracked
- **Local Storage:**
  - The status of which updates have been applied or acknowledged is tracked in your browser's local storage. This means the update banner or notification is specific to your browser and device.
  - If you clear your browser storage or use a different browser/device, you may see update notifications again, even if you have already applied or dismissed them elsewhere.

- **No Central Database:**
  - There is no central server or database that tracks which updates have been applied for each instance or user. The system relies on local checks and the current state of your instance (e.g., contract version, widget version, policy) to determine if an update is still relevant.

### What Users See
- **Update Banner:**
  - When an update is available and has not been marked as finished in your browser, a banner or notification will appear.
  - If you visit the updates page and the system detects that your instance is already up to date (for example, the contract or widget has already been upgraded), the update will disappear from the list and the banner will be removed.

- **Why Updates May Disappear:**
  - If you see an update notification but then visit the updates page and the update disappears, this means the system has checked your instance and determined that the update is no longer needed (e.g.,  the upgrade may have already been applied—possibly by another admin or from a different browser—or the update request might have already been created and is still pending a vote).
  - This can be confusing, but it is expected behavior due to the decentralized and stateless nature of the update tracking system.

### Tips for Users
- If you want to keep a record of which updates have been applied, consider keeping your browser storage intact or using the same device for administrative actions.
- If you are collaborating with other admins, be aware that update status is not synchronized between users—each admin's browser tracks updates independently, but the system will always check the actual state of the instance before showing or hiding updates.

---

## How to Publish an Update

1. **Edit the Shared UpdateRegistry Widget:**
   - All system updates are defined in a single shared file for all instances:  
     [`instances/widgets.treasury-factory.near/widget/pages/settings/system-updates/UpdateRegistry.jsx`](../../instances/widgets.treasury-factory.near/widget/pages/settings/system-updates/UpdateRegistry.jsx)
   - Open this file and return an array of update objects as shown in the examples above.

2. **Targeting Instances:**
   - To target specific treasury instances, add the `instances` field with an array of account IDs.
   - If you omit the `instances` field, the update will be visible to all instances.

3. **Testing Your Update:**
   - You can use Playwright tests (see `playwright-tests/tests/system-updates/update-specfied-instances.spec.js`) to verify how updates appear for different instances and users.

> **Note:** Only the `app.jsx` widget is separate per instance. All system updates are managed centrally in the shared UpdateRegistry file.

## Notes
- The update system supports both global and targeted updates.
- Users will see notifications for new updates and can review details as defined in the update object.
- Use unique `id` values for each update to avoid conflicts.

---

For more advanced usage or automation, refer to the Playwright test cases for system updates, which demonstrate how to programmatically inject and verify updates in different scenarios.
