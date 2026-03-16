# Sputnik-DAO Contract Feature Gap Analysis

## Overview

This document provides a comprehensive analysis of all features available in the Sputnik-DAO V2 contract and identifies which features are currently not supported in the NEAR Treasury UI. This analysis is intended to help UX designers understand the full capabilities of the Sputnik-DAO contract and plan for future UI enhancements.

**Document Version:** 1.0
**Last Updated:** 2025-10-13
**Contract Reference:** [Sputnik-DAO V2 Contract](https://github.com/near-daos/sputnik-dao-contract)

---

## Executive Summary

The Sputnik-DAO V2 contract offers 14+ distinct proposal types with extensive governance capabilities. The NEAR Treasury UI currently implements **5 major proposal types** with custom UI workflows, primarily focused on payments, settings management, and basic governance operations.

**Key Statistics:**
- **Total Sputnik-DAO Proposal Types:** 14+
- **Implemented in Treasury UI:** 5 (with FunctionCall only partially implemented)
- **Not Implemented:** 9+
- **Implementation Coverage:** ~36%

**Critical Gap Identified:**
While FunctionCall proposals have specialized workflows (staking, lockup, intents), there is **no generic FunctionCall interface** to interact with arbitrary smart contracts. This significantly limits the flexibility and power of the DAO, preventing interactions with DeFi protocols, NFT contracts, and custom smart contracts.

---

## Part 1: Complete Sputnik-DAO Contract Feature Inventory

### 1.1 Proposal Types

The Sputnik-DAO contract supports the following proposal types:

#### **1. ChangeConfig**
**Purpose:** Modifies the DAO's configuration settings
**Parameters:**
- `config`: Configuration object containing:
  - `name`: DAO name
  - `purpose`: DAO purpose/description
  - `metadata`: Base64-encoded metadata (logo, theme, colors, etc.)

**Use Cases:**
- Update DAO branding
- Modify DAO description
- Change theme colors and logos

---

#### **2. ChangePolicy**
**Purpose:** Updates the entire DAO policy in one transaction
**Parameters:**
- `policy`: Complete policy object with roles, permissions, voting policies, and parameters

**Use Cases:**
- Comprehensive policy overhauls
- Multiple simultaneous policy changes
- Initial policy setup

**Note:** This is a powerful but potentially risky operation as it replaces the entire policy structure.

---

#### **3. AddMemberToRole**
**Purpose:** Adds a specific member to a designated role
**Parameters:**
- `member_id`: Account ID to add
- `role`: Role name (string)

**Use Cases:**
- Onboarding new council members
- Granting specific permissions
- Role-based access management

---

#### **4. RemoveMemberFromRole**
**Purpose:** Removes a member from a specific role
**Parameters:**
- `member_id`: Account ID to remove
- `role`: Role name (string)

**Use Cases:**
- Offboarding members
- Revoking specific permissions
- Role management

---

#### **5. FunctionCall**
**Purpose:** Executes arbitrary function calls on external contracts
**Parameters:**
- `receiver_id`: Target contract account ID
- `actions`: Array of actions, each containing:
  - `method_name`: Function to call
  - `args`: Base64-encoded arguments
  - `deposit`: Attached deposit (yoctoNEAR)
  - `gas`: Gas allocation

**Use Cases:**
- Custom contract interactions
- Multi-step workflows
- Integration with external protocols
- Staking operations
- Token management
- Lockup contract operations

---

#### **6. UpgradeSelf**
**Purpose:** Upgrades the DAO contract itself using a code hash
**Parameters:**
- `hash`: Base58-encoded hash of the new contract code

**Use Cases:**
- DAO contract upgrades
- Security patches
- Feature additions
- Bug fixes

**Security Note:** Critical operation requiring high approval thresholds

---

#### **7. UpgradeRemote**
**Purpose:** Upgrades another contract remotely (requires appropriate permissions)
**Parameters:**
- `receiver_id`: Contract to upgrade
- `method_name`: Upgrade method name
- `hash`: Base58-encoded hash of new contract code

**Use Cases:**
- Upgrading sub-contracts
- Managing contract dependencies
- Protocol-wide upgrades

---

#### **8. Transfer**
**Purpose:** Transfers tokens between accounts
**Parameters:**
- `token_id`: Token contract ID (empty string for NEAR)
- `receiver_id`: Recipient account ID
- `amount`: Amount to transfer (in token's smallest unit)
- `msg`: Optional message

**Use Cases:**
- Payment processing
- Token distributions
- Grants and bounties
- Operating expenses

---

#### **9. SetStakingContract**
**Purpose:** Sets the staking contract for token-weighted voting (can only be set once)
**Parameters:**
- `staking_id`: Staking contract account ID

**Use Cases:**
- Token-weighted governance setup
- Delegated voting configuration
- Initial governance structure

**Note:** This can only be set once and cannot be changed after initialization.

---

#### **10. AddBounty**
**Purpose:** Creates a new bounty for work/tasks
**Parameters:**
- `bounty`: Bounty object containing:
  - `description`: Bounty description
  - `token`: Token for reward (empty string for NEAR)
  - `amount`: Reward amount
  - `times`: Number of times bounty can be claimed
  - `max_deadline`: Maximum completion deadline

**Use Cases:**
- Incentivizing development work
- Community contributions
- Task-based rewards
- Bug bounties

---

#### **11. BountyDone**
**Purpose:** Marks a bounty as completed and distributes the reward
**Parameters:**
- `bounty_id`: ID of the bounty
- `receiver_id`: Account ID of the bounty claimant

**Use Cases:**
- Completing bounty workflows
- Reward distribution
- Task completion acknowledgment

---

#### **12. Vote**
**Purpose:** A signaling proposal with no execution (pure governance vote)
**Parameters:** None (uses description field for vote details)

**Use Cases:**
- Community sentiment polling
- Non-binding votes
- Governance signaling
- Temperature checks

---

#### **13. FactoryInfoUpdate**
**Purpose:** Updates factory and auto-update information
**Parameters:**
- `factory_info`: Factory information object

**Use Cases:**
- DAO factory management
- Auto-update configuration
- Registry maintenance

---

#### **14. ChangePolicyAddOrUpdateRole**
**Purpose:** Adds or updates a single role in the policy (granular policy change)
**Parameters:**
- `role`: Role configuration object

**Use Cases:**
- Creating new roles
- Modifying role permissions
- Granular permission management

---

#### **15. ChangePolicyRemoveRole**
**Purpose:** Removes a specific role from the policy
**Parameters:**
- `role`: Role name to remove

**Use Cases:**
- Cleaning up unused roles
- Simplifying governance structure
- Role deprecation

---

#### **16. ChangePolicyUpdateDefaultVotePolicy**
**Purpose:** Updates the default voting policy for proposals
**Parameters:**
- `vote_policy`: Voting policy configuration

**Use Cases:**
- Adjusting quorum requirements
- Changing approval thresholds
- Modifying voting weights

---

#### **17. ChangePolicyUpdateParameters**
**Purpose:** Updates policy parameters (proposal bond, expiration, etc.)
**Parameters:**
- `parameters`: Policy parameters object

**Use Cases:**
- Adjusting proposal bonds
- Changing proposal duration
- Modifying bounty parameters

---

### 1.2 Voting Mechanisms

#### **Token Weight Voting**
- Users deposit tokens in a staking contract
- Can delegate voting power to other users
- Vote weight based on delegated token balance
- Undelegation has configurable waiting period

#### **Role Weight Voting**
- Vote weight based on role assignments
- Configurable weight per role
- Default weight: 1 per member

#### **Voting Thresholds**
Two threshold types supported:
1. **Ratio-based:** Requires percentage of total weight (e.g., 50% approval)
2. **Fixed weight:** Requires specific weight amount (e.g., 3 votes)

---

### 1.3 Roles and Permissions

#### **Permission System**
- **Granular permissions** per action type
- **Wildcard permissions** (e.g., `*:*` for all actions)
- **Action-specific permissions** (e.g., `*:AddProposal`, `config:VoteApprove`)

#### **Default Roles**
- `all`: All DAO members
- `council`: Council members (custom role)

#### **Permission Actions**
Available actions for permission configuration:
- `AddProposal`
- `RemoveProposal`
- `VoteApprove`
- `VoteReject`
- `VoteRemove`
- `Finalize`
- `MoveToHub`

---

### 1.4 Additional Features

#### **Blob Storage**
- Store arbitrary data associated with proposals
- Useful for large attachments or supplementary information
- Methods: `store_blob()`, `remove_blob()`

#### **Proposal States**
- `InProgress`: Active voting period
- `Approved`: Passed and executed successfully
- `Rejected`: Did not meet approval threshold
- `Removed`: Deleted by proposer or authorized member
- `Expired`: Voting period ended without reaching threshold
- `Failed`: Execution failed after approval

#### **Delegation System**
- Users can delegate voting power
- Delegated votes can be withdrawn (with waiting period)
- Supports token-weighted governance

---

## Part 2: Current Treasury UI Implementation

### 2.1 Implemented Features

#### **✅ Transfer Proposals**
**Implementation:** Comprehensive UI with multiple workflows
**Location:** `pages/payments/`

**Supported Capabilities:**
- NEAR token transfers
- Fungible token (FT) transfers
- Bulk payment imports (CSV)
- Payment request creation with proposal linking
- Recipient validation (NEAR accounts)
- Storage deposit handling for FT recipients
- Multi-wallet support (SputnikDAO, Lockup, Intents)

**UI Features:**
- Manual and proposal-linked payment requests
- Token selection dropdown
- Amount validation
- Recipient account verification
- USD conversion for NEAR
- Payment history tracking

---

#### **⚠️ FunctionCall Proposals** (Partial Implementation)
**Implementation:** Multiple specialized workflows
**Location:** Various pages

**Status:** ✅ Specialized workflows implemented | ❌ Generic FunctionCall not implemented

**Supported Use Cases:**

1. **Lockup Contract Operations** (`pages/lockup/`)
   - Create lockup contracts for FT and NEAR
   - Transfer from lockup contracts
   - Lockup contract management

2. **Stake Delegation** (`pages/stake-delegation/`)
   - Stake NEAR to validators
   - Unstake from validators
   - Withdraw staked NEAR
   - Validator selection with search

3. **NEAR Intents Withdrawals** (`pages/payments/`)
   - Cross-chain withdrawals via intents.near
   - Support for BTC, ETH, and other chains
   - FT withdrawal for NEAR tokens

4. **Asset Exchange**
   - Token swaps and exchanges

**UI Features:**
- Validator dropdowns with search
- Amount validation
- Balance checks
- Gas and deposit configuration
- Transaction tracking

**CRITICAL GAP:**
⚠️ **No generic/custom FunctionCall interface exists.** Users cannot create arbitrary function call proposals to interact with contracts outside the predefined workflows. This significantly limits the flexibility and power of the FunctionCall proposal type.

---

#### **✅ ChangePolicy Proposals**
**Implementation:** Multi-faceted settings management
**Location:** `pages/settings/`

**Supported Capabilities:**

1. **Member Management** (`pages/settings/members/`)
   - Add new members with role assignments
   - Edit member permissions
   - Remove members from roles
   - Bulk member operations
   - Visual role assignment interface

2. **Voting Thresholds** (`pages/settings/Thresholds.jsx`)
   - Configure required votes per proposal type
   - Separate thresholds for different actions
   - Visual threshold configuration

3. **Voting Duration** (`pages/settings/VotingDurationPage.jsx`)
   - Set proposal expiration period
   - Duration in days
   - Applies to all proposal types

**UI Features:**
- Interactive member tables
- Role assignment with permissions groups
- Bulk selection and editing
- Validation for conflicts
- Preview of policy changes
- Warning system for pending proposals

---

#### **✅ ChangeConfig Proposals**
**Implementation:** Theme and branding management
**Location:** `pages/settings/Theme.jsx`

**Supported Capabilities:**
- Logo upload (SVG, PNG, JPG - 256x256px)
- Primary color selection
- Theme selection (Light/Dark)
- Image upload to IPFS
- Real-time preview

**UI Features:**
- Color picker
- Image upload with validation
- Theme dropdown
- Visual preview
- Error handling for invalid images

---

#### **✅ UpgradeSelf Proposals**
**Implementation:** DAO contract upgrade workflow
**Location:** `pages/settings/system-updates/DAOContractUpdate.jsx`

**Supported Capabilities:**
- Check for contract updates
- Create upgrade proposals
- Verify contract hash
- Track upgrade status
- Automatic update detection

**UI Features:**
- Update notification system
- Version tracking
- Upgrade proposal creation
- Hash verification
- Update history

---

### 2.2 Common UI Patterns

#### **Proposal Creation Workflow**
1. Permission check (user authorization)
2. Form validation
3. Balance check (proposal bond)
4. Transaction creation
5. Transaction tracking
6. Success notification with proposal ID link

#### **Voting Interface**
- Approve/Reject buttons
- Vote count display
- Approver list with avatars
- Voting progress indicators
- Expiration countdown
- Required votes display

#### **Proposal Details Pages**
- Proposal ID and status
- Creation timestamp
- Proposer information
- Vote breakdown
- Transaction details (JSON view)
- Action buttons (approve/reject/delete)
- Copy link functionality

---

## Part 3: Unsupported Features & Integration Recommendations

### 3.1 AddMemberToRole & RemoveMemberFromRole

**Status:** ❌ Not Implemented (Using ChangePolicy Instead)

**Current Approach:**
The Treasury UI uses full `ChangePolicy` proposals for member management instead of granular `AddMemberToRole` / `RemoveMemberFromRole` proposals.

**Why These Features Matter:**
- **Simpler proposals:** Only change what's needed
- **Reduced risk:** Don't touch entire policy structure
- **Atomic operations:** Single role changes
- **Clearer audit trail:** Specific action history

**Integration Recommendations:**

#### **UI Design Considerations:**
1. **Add Member Quick Action**
   - Single-member addition form
   - Role selection dropdown
   - Minimal input fields
   - "Quick Add" vs "Batch Add" options

2. **Remove Member Quick Action**
   - Confirmation dialog
   - Role-specific removal
   - Impact warning (show other roles)

3. **When to Use vs ChangePolicy:**
   - Use `AddMemberToRole`: Single member, single role
   - Use `RemoveMemberFromRole`: Single member, single role
   - Use `ChangePolicy`: Multiple members, multiple roles, or complex changes

#### **Implementation Approach:**
```javascript
// Add Member
proposal_kind: {
  AddMemberToRole: {
    member_id: "alice.near",
    role: "council"
  }
}

// Remove Member
proposal_kind: {
  RemoveMemberFromRole: {
    member_id: "bob.near",
    role: "council"
  }
}
```

#### **Suggested UI Location:**
- `pages/settings/members/` - Add "Quick Actions" panel
- Member table row actions - Add individual add/remove buttons
- Consider toggle between "Simple" and "Advanced" modes

---

### 3.2 UpgradeRemote

**Status:** ❌ Not Implemented

**Purpose:** Remotely upgrade external contracts managed by the DAO

**Why This Feature Matters:**
- **Multi-contract DAOs:** Manage sub-contracts (lockup, staking, custom modules)
- **Protocol governance:** Upgrade entire protocol stacks
- **Factory patterns:** Manage contracts deployed by the DAO
- **Dependency management:** Keep sub-contracts in sync

**Use Cases:**
1. Upgrading lockup contracts deployed by the DAO
2. Upgrading custom staking contracts
3. Upgrading auxiliary contracts (oracle, pricing, etc.)
4. Factory-pattern contract management

**Integration Recommendations:**

#### **UI Design Considerations:**
1. **Contract Registry**
   - List of contracts managed by the DAO
   - Contract types and versions
   - Last upgrade dates
   - Current code hashes

2. **Upgrade Wizard**
   - Contract selection
   - New code hash input/selection
   - Upgrade method name specification
   - Dry-run/simulation option
   - Risk warnings

3. **Version Management**
   - Track available contract versions
   - Compare current vs. available versions
   - Show upgrade changelogs
   - Dependency checking

#### **Implementation Approach:**
```javascript
proposal_kind: {
  UpgradeRemote: {
    receiver_id: "lockup.treasury.near",
    method_name: "upgrade",
    hash: "EQBuC6ZNPLP6Y8zGW3F1K... " // Base58 hash
  }
}
```

#### **Suggested UI Location:**
- New page: `pages/settings/contract-management/`
- Or extend: `pages/settings/system-updates/` with "External Contracts" tab

#### **Safety Features:**
- Require code hash verification
- Show contract code diff
- Require high approval threshold
- Add time delay before execution
- Include rollback plan

---

### 3.3 SetStakingContract

**Status:** ❌ Not Implemented

**Purpose:** Configure staking contract for token-weighted voting

**Why This Feature Matters:**
- **Token governance:** Enable token-weighted voting
- **Delegation:** Allow vote delegation
- **Advanced governance:** Move beyond simple one-member-one-vote
- **Scalability:** Support large token holder bases

**Important Constraints:**
- ⚠️ **Can only be set ONCE** - irreversible decision
- Must be carefully planned before execution
- Affects all future governance

**Use Cases:**
1. Initial token governance setup
2. Enabling delegated voting
3. Creating token-weighted DAO structures
4. Transition from council to token governance

**Integration Recommendations:**

#### **UI Design Considerations:**
1. **Setup Wizard (One-Time)**
   - Big warning about irreversibility
   - Staking contract selection/input
   - Contract verification (check it exists)
   - Educational content about implications
   - Confirmation checklist

2. **Pre-Deployment Checklist**
   - ✓ Staking contract deployed
   - ✓ Staking contract tested
   - ✓ Token distribution complete
   - ✓ Delegation mechanism understood
   - ✓ DAO members educated

3. **Status Display**
   - Show if staking contract is set
   - Display current staking contract (if set)
   - Show governance mode (role-based vs. token-based)

#### **Implementation Approach:**
```javascript
proposal_kind: {
  SetStakingContract: {
    staking_id: "staking.treasury.near"
  }
}
```

#### **Suggested UI Location:**
- New page: `pages/settings/governance-setup/`
- Or: `pages/settings/advanced/` with big warning banner
- Should be prominently warned about in onboarding

#### **Safety Features:**
- Multi-step confirmation
- Educational modals
- Require manual typing of contract ID
- Show simulation of governance changes
- Require unanimous or near-unanimous approval

---

### 3.4 AddBounty & BountyDone

**Status:** ❌ Not Implemented

**Purpose:** Create and manage bounties for work/tasks

**Why These Features Matter:**
- **Incentivize contributions:** Reward community work
- **Structured rewards:** Clear task-based compensation
- **Transparency:** Public bounty tracking
- **Scalability:** Distribute work across community

**Current Workaround:**
Manual transfers used for bounty payments (no formal bounty system)

**Use Cases:**
1. Development bounties (features, bug fixes)
2. Content creation (articles, tutorials, videos)
3. Community moderation
4. Design work (logos, branding, UI/UX)
5. Research and analysis

**Integration Recommendations:**

#### **UI Design - Bounty Board**
1. **Bounty Listing Page** (`pages/bounties/`)
   - Active bounties grid/table
   - Bounty status indicators
   - Filter by category, amount, status
   - Search functionality
   - Claim counts (X of Y claimed)

2. **Create Bounty Form**
   - Title and description (markdown support)
   - Token selection
   - Reward amount
   - Number of times claimable
   - Maximum deadline
   - Category/tags
   - Acceptance criteria
   - Submission guidelines

3. **Bounty Detail Page**
   - Full description
   - Requirements
   - Reward details
   - Deadline countdown
   - Claim button
   - Submission form
   - Claim history
   - Discussion thread

4. **Complete Bounty Workflow**
   - Review submissions
   - Select winner
   - Create BountyDone proposal
   - Distribute reward

#### **Implementation Approach:**
```javascript
// Create bounty
proposal_kind: {
  AddBounty: {
    bounty: {
      description: "Create tutorial for Treasury UI",
      token: "", // NEAR
      amount: "50000000000000000000000000", // 50 NEAR
      times: 1, // Can be claimed once
      max_deadline: "1735689600000000000" // Unix timestamp in ns
    }
  }
}

// Complete bounty
proposal_kind: {
  BountyDone: {
    bounty_id: 5,
    receiver_id: "contributor.near"
  }
}
```

#### **Suggested UI Location:**
- New section: `pages/bounties/`
- Links from dashboard: "Active Bounties" widget
- Navigation: Add "Bounties" menu item

#### **Additional Features:**
- Bounty templates (common bounty types)
- Claim verification workflow
- Submission attachments (links, files)
- Bounty notifications
- Contributor reputation system
- Multi-claim tracking

---

### 3.5 Vote (Signaling Proposals)

**Status:** ❌ Not Implemented

**Purpose:** Non-binding governance votes for community sentiment

**Why This Feature Matters:**
- **Temperature checks:** Gauge community opinion before major decisions
- **Strategic planning:** Poll community on roadmap priorities
- **Conflict resolution:** Settle disputes through democratic process
- **Community engagement:** Give voice to all members

**Difference from Regular Proposals:**
- No on-chain execution
- Purely for signaling/sentiment
- Lower stakes than execution proposals
- Can be used to guide council decisions

**Use Cases:**
1. **Feature prioritization polls**
   - "Should we build feature A or B next?"

2. **Strategic direction votes**
   - "Should we focus on DeFi or NFTs?"

3. **Community sentiment**
   - "Do members support the proposed partnership?"

4. **Process improvements**
   - "Should we change meeting schedule?"

5. **Controversy resolution**
   - "Should we reverse previous decision X?"

**Integration Recommendations:**

#### **UI Design Considerations:**
1. **Create Vote Form**
   - Clear "Signaling Vote" label
   - Question/motion text
   - Multiple choice vs. Yes/No
   - Description/context
   - Voting period
   - Visual distinction from execution proposals

2. **Vote Display**
   - Large "NON-BINDING" indicator
   - Poll results (real-time)
   - Percentage breakdowns
   - Voter list
   - Arguments for/against

3. **Results Summary**
   - Final tally
   - Participation rate
   - Outcome interpretation
   - Next steps recommendations

#### **Implementation Approach:**
```javascript
proposal_kind: {
  Vote: {} // No parameters
}

// All details in description
description: {
  title: "Should we integrate with Protocol X?",
  summary: "Vote on whether to pursue integration...",
  options: "Yes / No / Abstain" // Optional formatting
}
```

#### **Suggested UI Location:**
- New page: `pages/governance/polls/`
- Or extend: `pages/proposals-feed/` with "Signaling" filter
- Dashboard widget: "Active Polls"

#### **Enhanced Features:**
- Multiple choice options (beyond approve/reject)
- Anonymous voting option
- Weighted vs. unweighted results
- Time-series result tracking
- Export results to reports
- Link to follow-up execution proposals

---

### 3.6 FactoryInfoUpdate

**Status:** ❌ Not Implemented

**Purpose:** Update factory configuration and auto-update settings

**Why This Feature Matters:**
- **Maintenance:** Keep DAO connected to factory
- **Auto-updates:** Enable automated upgrade proposals
- **Registry management:** Maintain DAO registry data
- **Factory governance:** Participate in factory-level decisions

**Technical Context:**
- Most DAOs are deployed by a factory contract (e.g., `sputnik-dao.near`)
- Factory maintains registry of all deployed DAOs
- Can push auto-updates to DAOs
- Stores default configurations

**Use Cases:**
1. Update DAO's factory registration
2. Enable/disable auto-update mechanism
3. Change factory auto-update settings
4. Update metadata in factory registry

**Integration Recommendations:**

#### **UI Design Considerations:**
1. **Factory Info Display**
   - Current factory contract
   - Auto-update status (enabled/disabled)
   - Factory version
   - Last update check
   - Registry status

2. **Update Form**
   - Factory info fields
   - Auto-update toggle
   - Version preference
   - Update frequency settings

3. **Advanced Settings Page**
   - This is advanced/technical
   - Should be in "Advanced Settings" section
   - Include documentation links
   - Show current factory info

#### **Implementation Approach:**
```javascript
proposal_kind: {
  FactoryInfoUpdate: {
    factory_info: {
      factory_id: "sputnik-dao.near",
      auto_update: true // or false
      // Additional factory-specific fields
    }
  }
}
```

#### **Suggested UI Location:**
- `pages/settings/advanced/factory-settings/`
- Only visible to high-permission roles
- Include educational content

#### **Warnings:**
- Changing factory can be risky
- Disabling auto-update needs consideration
- Should require high approval threshold

**Priority:** Low - Most DAOs don't need to change this

---

### 3.7 Granular Policy Change Proposals

**Status:** ❌ Not Implemented (Using Full ChangePolicy)

**Variants:**
- `ChangePolicyAddOrUpdateRole`
- `ChangePolicyRemoveRole`
- `ChangePolicyUpdateDefaultVotePolicy`
- `ChangePolicyUpdateParameters`

**Why These Features Matter:**
- **Surgical changes:** Modify one aspect without touching others
- **Reduced risk:** Don't expose entire policy to changes
- **Clearer intentions:** Proposal purpose is explicit
- **Better audit trail:** See exactly what changed

**Current Implementation:**
Treasury UI uses full `ChangePolicy` proposals that replace the entire policy object, even for small changes.

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| **Full ChangePolicy** (current) | Simple implementation, One proposal type | Risky (can break policy), Unclear what changed, Hard to review |
| **Granular Proposals** | Safer, Clear intent, Easy to review | More complexity, More proposal types to handle |

**Integration Recommendations:**

#### **UI Design - Smart Mode Selection**

Implement "Simple Mode" vs. "Advanced Mode":

1. **Simple Mode** (granular proposals)
   - Add/Update Role → `ChangePolicyAddOrUpdateRole`
   - Remove Role → `ChangePolicyRemoveRole`
   - Change Voting Rules → `ChangePolicyUpdateDefaultVotePolicy`
   - Change Parameters → `ChangePolicyUpdateParameters`
   - User-friendly forms
   - Guided workflows

2. **Advanced Mode** (full policy)
   - Full `ChangePolicy`
   - JSON editor
   - For complex multi-change scenarios
   - Show policy diff
   - Require confirmation

#### **Implementation Examples:**

```javascript
// Add or update a role
proposal_kind: {
  ChangePolicyAddOrUpdateRole: {
    role: {
      name: "treasurer",
      kind: "Group",
      permissions: ["*:*"], // All permissions
      vote_policy: { /* voting rules */ }
    }
  }
}

// Remove a role
proposal_kind: {
  ChangePolicyRemoveRole: {
    role: "old-role-name"
  }
}

// Update default vote policy
proposal_kind: {
  ChangePolicyUpdateDefaultVotePolicy: {
    vote_policy: {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [3, 5] // 3 out of 5
    }
  }
}

// Update parameters
proposal_kind: {
  ChangePolicyUpdateParameters: {
    parameters: {
      proposal_bond: "100000000000000000000000", // 0.1 NEAR
      proposal_period: "604800000000000", // 7 days
      bounty_bond: "100000000000000000000000",
      bounty_forgiveness_period: "86400000000000" // 1 day
    }
  }
}
```

#### **Suggested UI Location:**
Enhance existing settings pages:
- `pages/settings/members/` → Add "role management" with granular options
- `pages/settings/governance/` → New page for voting policy
- `pages/settings/parameters/` → New page for proposal parameters

#### **Migration Strategy:**
1. Phase 1: Add granular proposals alongside current ChangePolicy
2. Phase 2: Make granular the default, ChangePolicy "Advanced"
3. Phase 3: Add warnings to ChangePolicy ("risky, consider granular")

**Priority:** High - This improves safety and usability significantly

---

### 3.8 Generic/Custom FunctionCall Proposals

**Status:** ❌ Not Implemented (Only Specialized Workflows Available)

**Current Limitation:**
While the Treasury UI supports specialized FunctionCall workflows (staking, lockup, intents), there is **no generic interface** for creating arbitrary FunctionCall proposals. Users cannot interact with smart contracts that don't have pre-built UI workflows.

**Why This Feature Matters:**
- **Flexibility:** Interact with ANY NEAR smart contract
- **Future-proofing:** Support new protocols without UI updates
- **Advanced use cases:** Complex multi-contract interactions
- **Protocol integrations:** DEXs, lending, NFTs, gaming, etc.
- **Emergency operations:** Unexpected contract interactions

**Real-World Use Cases:**

1. **DeFi Integrations**
   - Interact with DEX contracts (Ref Finance, Jumbo Exchange)
   - Provide liquidity to AMM pools
   - Stake tokens in yield farms
   - Claim rewards from DeFi protocols

2. **NFT Operations**
   - Mint NFTs from DAO treasury
   - List NFTs on marketplaces
   - Create NFT collections
   - Transfer NFTs between accounts

3. **Custom Contract Interactions**
   - Call methods on custom DAO-deployed contracts
   - Interact with oracle contracts
   - Trigger automated systems
   - Update external registries

4. **Multi-Step Workflows**
   - Complex transactions requiring multiple actions
   - Atomic operations across contracts
   - Custom financial operations

5. **Emergency Operations**
   - Rescue tokens from contracts
   - Emergency contract interactions
   - Unexpected scenarios requiring flexibility

**Integration Recommendations:**

#### **UI Design - Two Approaches**

**Option A: Advanced Form (Recommended)**
1. **Contract Interaction Builder**
   - Target contract address input
   - Method name input (with auto-complete from contract ABI)
   - Arguments builder:
     - JSON editor for complex args
     - Visual form builder for simple args
     - Argument validation
   - Gas amount configuration (with presets)
   - Deposit amount configuration
   - Preview/validation before submission

2. **Multiple Actions Support**
   - Add multiple function calls in one proposal
   - Reorder actions
   - Delete actions
   - Clone/duplicate actions

3. **Contract Explorer Integration**
   - Browse available methods on contract
   - Show method signatures
   - Parameter documentation
   - Example calls

4. **Safety Features**
   - Simulate/dry-run before proposal
   - Show estimated outcomes
   - Risk warnings for unfamiliar contracts
   - Require additional confirmation

**Option B: Developer Mode / JSON Editor**
1. **Raw JSON Input**
   - Direct JSON editing
   - Schema validation
   - Syntax highlighting
   - Example templates

2. **Import/Export**
   - Save common interactions as templates
   - Share proposal configs
   - Import from files

#### **UI Design Considerations:**

1. **User Levels**
   - **Beginner Mode:** Use specialized workflows only
   - **Advanced Mode:** Generic FunctionCall form (simplified)
   - **Developer Mode:** Full JSON editor with all options

2. **Templates Library**
   - Common contract interactions as templates
   - Community-contributed templates
   - Verified safe templates
   - Custom templates per DAO

3. **ABI Integration**
   - Fetch contract ABI/schema if available
   - Auto-generate form fields from ABI
   - Type checking based on ABI
   - Method documentation display

4. **Simulation & Preview**
   - Call `view` methods to preview state
   - Dry-run transactions (if possible)
   - Show expected outcomes
   - Warn about irreversible actions

5. **Security Warnings**
   - Flag unknown/unverified contracts
   - Show previous interactions with contract
   - Display security audit status
   - Require extra confirmation for risky calls

#### **Implementation Approach:**

```javascript
// Generic FunctionCall proposal structure
proposal_kind: {
  FunctionCall: {
    receiver_id: "ref-finance.near",
    actions: [
      {
        method_name: "swap",
        args: "eyJhY3Rpb25zIjogW3sidG9rZW5faW4iOiAibmVhciIsICJ0b2tlbl9vdXQiOiAidXNkYy5uZWFyIn1dfQ==", // Base64
        deposit: "1", // 1 yoctoNEAR
        gas: "50000000000000" // 50 TGas
      }
    ]
  }
}
```

**Example Form Flow:**

1. User selects "Custom Contract Interaction"
2. Enters contract ID: `token.near`
3. System fetches available methods (if ABI available)
4. User selects method: `ft_transfer`
5. Form shows parameters:
   - `receiver_id` (string) - required
   - `amount` (string) - required
   - `memo` (string) - optional
6. User fills parameters:
   - receiver_id: `alice.near`
   - amount: `1000000000000000000000000` (1 token with 24 decimals)
   - memo: `"Payment for services"`
7. User sets gas: `30 TGas` (from preset or custom)
8. User sets deposit: `1 yoctoNEAR` (common for FT transfers)
9. System shows preview:
   - "This will transfer 1 TOKEN to alice.near"
   - "Estimated gas cost: 0.003 NEAR"
10. User clicks "Create Proposal"
11. Normal proposal flow continues

#### **Suggested UI Location:**
- New page: `pages/contracts/custom-interaction/`
- Or: Add to `pages/proposals-feed/` with "Custom" option in proposal type dropdown
- Navigation: Settings → Advanced → Custom Contract Calls

#### **Safety Features:**

**Critical Safety Requirements:**
1. ⚠️ **Show decoded arguments** in human-readable format
2. 🔍 **Verify target contract exists** before submission
3. ⛔ **Block known malicious contracts** (blacklist)
4. 🎯 **Require high permissions** for custom calls
5. 📋 **Mandate description/justification** for proposal
6. 🧪 **Encourage testing** on testnet first
7. 💾 **Save successful calls** as templates

**Warning System:**
- Yellow warning: Unverified contract
- Orange warning: No previous interactions
- Red warning: Failed simulation
- Critical: Potential security risk detected

#### **Advanced Features:**

1. **Batch Operations**
   - Multiple function calls in one proposal
   - Cross-contract workflows
   - Conditional execution (if supported)

2. **Contract Favorites**
   - Save frequently used contracts
   - Quick access to common methods
   - DAO-specific contract registry

3. **History & Analytics**
   - Show previous FunctionCall proposals
   - Success/failure rates per contract
   - Gas usage analytics
   - Most common interactions

4. **Testing Tools**
   - Test on testnet before mainnet
   - Clone proposal to testnet
   - Simulation results
   - Gas estimation

5. **Documentation**
   - Inline help for each field
   - Common patterns guide
   - Link to contract docs
   - Video tutorials

#### **User Education Needs:**

**Essential Education:**
- What is a FunctionCall proposal?
- Understanding gas and deposits
- Base64 encoding of arguments
- How to read contract methods
- Common pitfalls and errors

**Documentation:**
- Step-by-step guides for common contracts
- List of verified/safe contracts
- Gas estimation guidelines
- Troubleshooting guide

**In-App Guidance:**
- Tooltips on every field
- "Learn More" links
- Example proposals
- Interactive tutorial

#### **Implementation Priority:**

This is a **HIGH PRIORITY** feature because:
- Unlocks full potential of Sputnik-DAO FunctionCall
- Currently blocks many legitimate use cases
- Relatively contained implementation (one new page/form)
- High user demand from advanced DAO operators

**Complexity:** Medium-High
- Form validation can be complex
- ABI integration adds complexity
- Security considerations are critical
- Testing needs to be thorough

**Recommended Approach:**
1. **Phase 1:** Basic form with manual JSON input
2. **Phase 2:** Enhanced form with visual builder
3. **Phase 3:** ABI integration and auto-complete
4. **Phase 4:** Templates and safety features

---

## Part 4: Feature Prioritization Matrix

### Priority Levels

#### **🔴 High Priority** (Significant Impact, Common Use Cases)
1. **Generic/Custom FunctionCall Interface**
   - **Impact:** Very High - Unlocks full FunctionCall potential
   - **Complexity:** Medium-High - Complex form, security considerations
   - **User Demand:** High - Frequently requested by advanced users
   - **Flexibility:** Critical - Enables interaction with any contract
   - **Blocking:** Currently blocks many legitimate use cases

2. **AddMemberToRole / RemoveMemberFromRole**
   - **Impact:** High - Simplifies common governance operations
   - **Complexity:** Low - Simple implementation
   - **User Demand:** High - Very common use case
   - **Risk Reduction:** High - Safer than full ChangePolicy

3. **Granular Policy Changes**
   - **Impact:** High - Safer governance
   - **Complexity:** Medium - Need multiple UIs
   - **User Demand:** Medium-High
   - **Risk Reduction:** Very High

4. **Vote (Signaling Proposals)**
   - **Impact:** High - Enables important governance patterns
   - **Complexity:** Low - No execution logic
   - **User Demand:** Medium - Growing interest in governance
   - **Engagement:** High - Increases community participation

#### **🟡 Medium Priority** (Useful, Less Common)
5. **AddBounty / BountyDone**
   - **Impact:** Medium - Enables new workflows
   - **Complexity:** Medium - Requires bounty management system
   - **User Demand:** Medium - Some DAOs need this
   - **Alternative:** Manual payments work (less structured)

6. **UpgradeRemote**
   - **Impact:** Medium - For multi-contract DAOs
   - **Complexity:** High - Contract registry needed
   - **User Demand:** Low - Only sophisticated DAOs need this
   - **Risk:** High - Contract upgrades are risky

#### **🟢 Low Priority** (Niche, Complex, or Rarely Used)
7. **SetStakingContract**
   - **Impact:** Low - Only for token governance
   - **Complexity:** Low - Simple proposal
   - **User Demand:** Very Low - Most DAOs use role-based
   - **Risk:** Very High - Irreversible, major change
   - **Note:** Should be part of initial setup, not ongoing operations

8. **FactoryInfoUpdate**
   - **Impact:** Very Low - Rarely changed
   - **Complexity:** Low - Simple form
   - **User Demand:** Very Low - Technical/administrative
   - **Risk:** Medium - Can break factory connection

---

## Part 5: AI-Driven Prototype Implementation Roadmap

> **Target:** This roadmap is designed for an AI coding assistant (Claude) to autonomously implement a complete Treasury UI prototype with full Sputnik-DAO contract support.

### Project Overview

**Objective:** Build a standalone Next.js web application that provides a complete UI for all Sputnik-DAO proposal types, with its own NEAR sandbox server for local testing without mainnet deployment.

**Key Requirements:**
- **Technology Stack:** Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend:** Custom Node.js server with embedded NEAR sandbox
- **Contract:** Full Sputnik-DAO V2 contract support (all 17+ proposal types)
- **Testing:** Local-only with sandbox, no mainnet deployment needed
- **Location:** `/prototype-ui/` folder in current repository

**Architecture:**
```
prototype-ui/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home/Dashboard
│   ├── proposals/         # Proposal creation & listing
│   ├── vote/              # Voting interface
│   └── settings/          # DAO settings
├── components/            # React components
├── lib/                   # Utilities, NEAR integration
├── server/                # Custom Node.js server
│   ├── sandbox.ts         # NEAR sandbox wrapper
│   └── contracts.ts       # Contract deployment logic
└── types/                 # TypeScript types
```

---

## Phase 1: Project Setup & Sandbox Infrastructure
**Goal:** Set up Next.js project and create a fully functional NEAR sandbox server

### Step 1.1: Initialize Next.js Project

**Context for Claude:**
- Create a new Next.js project inside the existing repo
- Use TypeScript, Tailwind CSS, and App Router
- Set up proper folder structure

**Tasks:**
1. Create `/prototype-ui/` directory in repository root
2. Initialize Next.js project:
   ```bash
   cd prototype-ui
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
   ```
3. Install required dependencies:
   ```bash
   npm install near-api-js @near-js/accounts @near-js/keystores
   npm install -D @types/node
   ```

4. Create initial folder structure:
   ```
   prototype-ui/
   ├── app/
   ├── components/
   ├── lib/
   │   ├── near/
   │   └── utils/
   ├── server/
   ├── types/
   └── public/
   ```

5. Update `package.json` with custom scripts:
   ```json
   {
     "scripts": {
       "dev": "node server/index.js",
       "sandbox:start": "node server/sandbox.js"
     }
   }
   ```

**Deliverable:** Initialized Next.js project with proper structure

---

### Step 1.2: Create NEAR Sandbox Server

**Context for Claude:**
You need to create a custom Node.js server that:
1. Starts a NEAR sandbox instance
2. Deploys all necessary contracts (Sputnik-DAO factory, social.near mock, etc.)
3. Creates test accounts with keys
4. Provides RPC endpoint for the Next.js frontend
5. Manages contract state

**Reference:** Examine `/playground-tests/util/sandboxrpc.js` for inspiration, but create a simplified version.

**File: `/prototype-ui/server/sandbox.ts`**

Create a TypeScript file that:
1. Spawns NEAR sandbox process
2. Initializes NEAR connection
3. Deploys contracts
4. Exports sandbox instance

**Key Code Structure:**
```typescript
import { spawn } from 'child_process';
import { connect, KeyPair, keyStores, utils } from 'near-api-js';

export class PrototypeSandbox {
  private sandbox: any;
  private near: any;
  private keyStore: keyStores.InMemoryKeyStore;
  public rpcUrl: string;
  public accounts: Map<string, { accountId: string, keyPair: KeyPair }>;

  async init() {
    // 1. Start sandbox
    // 2. Setup NEAR connection
    // 3. Deploy contracts
    // 4. Create test accounts
  }

  async deployContracts() {
    // Deploy sputnik-dao factory
    // Deploy social.near mock (for profiles)
    // Deploy test token contract (for FT testing)
  }

  async createTestAccounts() {
    // Create 5-10 test accounts: alice.near, bob.near, etc.
    // Store keys for frontend access
  }
}
```

**Detailed Implementation Steps:**

1. **Start Sandbox Process:**
   - Use `near-sandbox` npm package OR
   - Spawn sandbox binary if available
   - Capture RPC URL from sandbox output
   - Wait for sandbox to be ready

2. **Deploy Sputnik-DAO Factory:**
   - Download latest sputnik-dao contract WASM
   - Deploy to `sputnik-dao.near`
   - Initialize factory

3. **Create Test Accounts:**
   - Create 10 test accounts:
     - `dev-account.near` (main admin)
     - `alice.near` (member)
     - `bob.near` (member)
     - `carol.near` (member)
     - `dave.near` (member)
     - `treasury-dao.sputnik-dao.near` (DAO instance)
   - Generate keypairs for each
   - Fund accounts with NEAR

4. **Create Test DAO:**
   - Call factory to create `treasury-dao`
   - Set up policy with all proposal types enabled
   - Add test accounts as members

5. **Expose API:**
   - Create Express server on port 3001
   - Endpoints:
     - `GET /api/accounts` - List test accounts
     - `GET /api/rpc` - Return RPC URL
     - `POST /api/rpc` - Proxy RPC calls to sandbox
     - `GET /api/dao/:daoId` - Get DAO details

**File: `/prototype-ui/server/index.js`**

Create main server file:
```javascript
import express from 'express';
import { PrototypeSandbox } from './sandbox';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function main() {
  // 1. Initialize sandbox
  const sandbox = new PrototypeSandbox();
  await sandbox.init();

  // 2. Start Express server
  const server = express();

  // Sandbox API routes
  server.get('/api/accounts', (req, res) => {
    res.json([...sandbox.accounts.values()]);
  });

  server.post('/api/rpc', async (req, res) => {
    // Proxy to sandbox RPC
  });

  // 3. Start Next.js
  await app.prepare();
  server.all('*', (req, res) => handle(req, res));

  server.listen(3000);
  console.log('✅ Prototype running on http://localhost:3000');
}

main();
```

**Deliverable:** Functional sandbox server that starts with `npm run dev`

---

### Step 1.3: Create NEAR Integration Library

**Context for Claude:**
Create a client-side library for interacting with NEAR contracts through the sandbox.

**File: `/prototype-ui/lib/near/client.ts`**

```typescript
import { connect, KeyPair, keyStores } from 'near-api-js';

export class NearClient {
  private near: any;
  private keyStore: keyStores.BrowserLocalStorageKeyStore;

  async init(rpcUrl: string) {
    this.keyStore = new keyStores.BrowserLocalStorageKeyStore();
    this.near = await connect({
      networkId: 'sandbox',
      nodeUrl: rpcUrl,
      keyStore: this.keyStore
    });
  }

  async setAccount(accountId: string, privateKey: string) {
    const keyPair = KeyPair.fromString(privateKey);
    await this.keyStore.setKey('sandbox', accountId, keyPair);
  }

  async callContract(params: {
    contractId: string;
    methodName: string;
    args: any;
    gas?: string;
    deposit?: string;
  }) {
    // Implementation
  }

  async viewContract(params: {
    contractId: string;
    methodName: string;
    args: any;
  }) {
    // Implementation
  }
}
```

**Deliverable:** NEAR client library for frontend

---

## Phase 2: Core UI Components & Layout
**Goal:** Build foundational UI components, layout, and account management

### Step 2.1: Create Layout & Navigation

**Context for Claude:**
Create a responsive layout with navigation for the prototype app.

**File: `/prototype-ui/app/layout.tsx`**

```typescript
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { AccountSelector } from '@/components/AccountSelector';

export default function RootLayout({
  children,
}: {
  children: React.Node
}) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between">
            <div className="flex gap-6">
              <Link href="/">Dashboard</Link>
              <Link href="/proposals">Proposals</Link>
              <Link href="/vote">Vote</Link>
              <Link href="/settings">Settings</Link>
            </div>
            <AccountSelector />
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

**File: `/prototype-ui/components/AccountSelector.tsx`**

Create account dropdown that:
1. Fetches accounts from `/api/accounts`
2. Displays dropdown with account names
3. On select, stores account ID and private key in localStorage
4. Initializes NearClient with selected account

```typescript
'use client';

export function AccountSelector() {
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(setAccounts);
  }, []);

  const handleSelect = async (account) => {
    // Store in localStorage
    localStorage.setItem('accountId', account.accountId);
    localStorage.setItem('privateKey', account.privateKey);

    // Initialize NEAR client
    const client = new NearClient();
    await client.init(rpcUrl);
    await client.setAccount(account.accountId, account.privateKey);

    setSelected(account);
  };

  return (
    <select onChange={(e) => handleSelect(accounts[e.target.value])}>
      <option>Select Account</option>
      {accounts.map((acc, i) => (
        <option key={i} value={i}>{acc.accountId}</option>
      ))}
    </select>
  );
}
```

**Deliverable:** Working layout with account selection

---

### Step 2.2: TypeScript Types for Sputnik-DAO

**Context for Claude:**
Define TypeScript types for all Sputnik-DAO proposal types and related structures.

**File: `/prototype-ui/types/sputnik.ts`**

```typescript
// Proposal Kinds
export type ProposalKind =
  | { ChangeConfig: { config: Config } }
  | { ChangePolicy: { policy: Policy } }
  | { AddMemberToRole: { member_id: string; role: string } }
  | { RemoveMemberFromRole: { member_id: string; role: string } }
  | { FunctionCall: { receiver_id: string; actions: Action[] } }
  | { UpgradeSelf: { hash: string } }
  | { UpgradeRemote: { receiver_id: string; method_name: string; hash: string } }
  | { Transfer: { token_id: string; receiver_id: string; amount: string; msg?: string } }
  | { SetStakingContract: { staking_id: string } }
  | { AddBounty: { bounty: Bounty } }
  | { BountyDone: { bounty_id: number; receiver_id: string } }
  | { Vote: {} }
  | { FactoryInfoUpdate: { factory_info: FactoryInfo } }
  | { ChangePolicyAddOrUpdateRole: { role: Role } }
  | { ChangePolicyRemoveRole: { role: string } }
  | { ChangePolicyUpdateDefaultVotePolicy: { vote_policy: VotePolicy } }
  | { ChangePolicyUpdateParameters: { parameters: PolicyParameters } };

export interface Action {
  method_name: string;
  args: string; // Base64 encoded
  deposit: string;
  gas: string;
}

export interface Proposal {
  id: number;
  proposer: string;
  description: string;
  kind: ProposalKind;
  status: ProposalStatus;
  vote_counts: Record<string, number>;
  votes: Record<string, Vote>;
  submission_time: string;
}

export type ProposalStatus =
  | 'InProgress'
  | 'Approved'
  | 'Rejected'
  | 'Removed'
  | 'Expired'
  | 'Failed';

export type Vote = 'Approve' | 'Reject' | 'Remove';

export interface Config {
  name: string;
  purpose: string;
  metadata: string; // Base64 encoded
}

export interface Policy {
  roles: Role[];
  default_vote_policy: VotePolicy;
  proposal_bond: string;
  proposal_period: string;
  bounty_bond: string;
  bounty_forgiveness_period: string;
}

export interface Role {
  name: string;
  kind: 'Everyone' | { Group: string[] };
  permissions: string[];
  vote_policy: Record<string, VotePolicy>;
}

export interface VotePolicy {
  weight_kind: 'RoleWeight' | 'TokenWeight';
  quorum: string;
  threshold: string | [number, number];
}

export interface Bounty {
  description: string;
  token: string;
  amount: string;
  times: number;
  max_deadline: string;
}

// Add more types as needed...
```

**Deliverable:** Complete TypeScript types for Sputnik-DAO

---

### Step 2.3: Create Reusable UI Components

**Context for Claude:**
Build reusable components for common UI patterns.

**Components to Create:**

1. **`/components/ProposalCard.tsx`** - Display proposal summary
2. **`/components/ProposalStatus.tsx`** - Status badge (InProgress, Approved, etc.)
3. **`/components/VoteButtons.tsx`** - Approve/Reject/Remove buttons
4. **`/components/FormField.tsx`** - Reusable form input
5. **`/components/LoadingSpinner.tsx`** - Loading indicator
6. **`/components/Toast.tsx`** - Success/error notifications
7. **`/components/Modal.tsx`** - Modal dialog

**Example `/components/ProposalCard.tsx`:**

```typescript
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const kindName = Object.keys(proposal.kind)[0];

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">#{proposal.id}</h3>
          <p className="text-gray-600 text-sm">{kindName}</p>
        </div>
        <ProposalStatus status={proposal.status} />
      </div>

      <p className="mt-2 text-gray-700">{proposal.description}</p>

      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-500">
          By {proposal.proposer}
        </span>
        <Link href={`/proposals/${proposal.id}`}>
          <button className="text-blue-600">View Details →</button>
        </Link>
      </div>
    </div>
  );
}
```

**Deliverable:** Set of reusable UI components

---

## Phase 3: Proposal Listing & Viewing
**Goal:** Display proposals and proposal details

### Step 3.1: Proposals List Page

**File: `/prototype-ui/app/proposals/page.tsx`**

Create page that:
1. Fetches all proposals from DAO contract
2. Filters by status (InProgress, Approved, Rejected, etc.)
3. Displays in grid/list
4. Links to proposal details

```typescript
'use client';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState<'all' | ProposalStatus>('all');

  useEffect(() => {
    async function fetchProposals() {
      const client = new NearClient();
      // Initialize client...

      const lastId = await client.viewContract({
        contractId: 'treasury-dao.sputnik-dao.near',
        methodName: 'get_last_proposal_id',
        args: {}
      });

      const proposals = [];
      for (let i = 0; i <= lastId; i++) {
        const proposal = await client.viewContract({
          contractId: 'treasury-dao.sputnik-dao.near',
          methodName: 'get_proposal',
          args: { id: i }
        });
        proposals.push(proposal);
      }

      setProposals(proposals);
    }

    fetchProposals();
  }, []);

  const filtered = filter === 'all'
    ? proposals
    : proposals.filter(p => p.status === filter);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Proposals</h1>
        <Link href="/proposals/create">
          <button className="btn-primary">Create Proposal</button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('InProgress')}>In Progress</button>
        <button onClick={() => setFilter('Approved')}>Approved</button>
        <button onClick={() => setFilter('Rejected')}>Rejected</button>
      </div>

      {/* Proposals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(proposal => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}
```

**Deliverable:** Working proposals list page

---

### Step 3.2: Proposal Details Page

**File: `/prototype-ui/app/proposals/[id]/page.tsx`**

Create dynamic route for proposal details:
1. Fetch specific proposal by ID
2. Display full proposal information
3. Show vote counts and voters
4. Render proposal-kind-specific details
5. Include voting buttons (if user has permission)

```typescript
export default async function ProposalDetailsPage({
  params
}: {
  params: { id: string }
}) {
  // Fetch proposal
  const proposal = await fetchProposal(parseInt(params.id));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        Proposal #{proposal.id}
      </h1>

      <ProposalStatus status={proposal.status} />

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Description</h2>
        <p>{proposal.description}</p>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Details</h2>
        <ProposalKindDetails kind={proposal.kind} />
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Votes</h2>
        <VotesList votes={proposal.votes} />
      </div>

      {proposal.status === 'InProgress' && (
        <div className="mt-6">
          <VoteButtons proposalId={proposal.id} />
        </div>
      )}
    </div>
  );
}
```

**Component: `ProposalKindDetails.tsx`**

Render proposal-kind-specific information:

```typescript
export function ProposalKindDetails({ kind }: { kind: ProposalKind }) {
  const kindName = Object.keys(kind)[0];
  const kindData = kind[kindName];

  switch (kindName) {
    case 'Transfer':
      return (
        <div>
          <p><strong>Token:</strong> {kindData.token_id || 'NEAR'}</p>
          <p><strong>Receiver:</strong> {kindData.receiver_id}</p>
          <p><strong>Amount:</strong> {formatAmount(kindData.amount)}</p>
        </div>
      );

    case 'FunctionCall':
      return (
        <div>
          <p><strong>Contract:</strong> {kindData.receiver_id}</p>
          <h3 className="mt-2 font-semibold">Actions:</h3>
          {kindData.actions.map((action, i) => (
            <div key={i} className="ml-4 mt-2 border-l-2 pl-4">
              <p><strong>Method:</strong> {action.method_name}</p>
              <p><strong>Gas:</strong> {action.gas}</p>
              <p><strong>Deposit:</strong> {action.deposit}</p>
              <details>
                <summary>Arguments (Base64)</summary>
                <pre className="text-xs">{action.args}</pre>
              </details>
              <details>
                <summary>Arguments (Decoded)</summary>
                <pre className="text-xs">
                  {JSON.stringify(
                    JSON.parse(atob(action.args)),
                    null,
                    2
                  )}
                </pre>
              </details>
            </div>
          ))}
        </div>
      );

    // Add cases for all other proposal types...

    default:
      return <pre>{JSON.stringify(kindData, null, 2)}</pre>;
  }
}
```

**Deliverable:** Working proposal details page with kind-specific rendering

---

## Phase 4: Proposal Creation - All Types
**Goal:** Implement creation forms for ALL 17+ Sputnik-DAO proposal types

### Step 4.1: Proposal Type Selector

**File: `/prototype-ui/app/proposals/create/page.tsx`**

Create main proposal creation page with type selector:

```typescript
const PROPOSAL_TYPES = [
  { id: 'transfer', name: 'Transfer', description: 'Send tokens to an account' },
  { id: 'function_call', name: 'Function Call', description: 'Call a smart contract method' },
  { id: 'change_config', name: 'Change Config', description: 'Update DAO configuration' },
  { id: 'change_policy', name: 'Change Policy', description: 'Update DAO policy' },
  { id: 'add_member_to_role', name: 'Add Member to Role', description: 'Add member to a role' },
  { id: 'remove_member_from_role', name: 'Remove Member from Role', description: 'Remove member from role' },
  { id: 'upgrade_self', name: 'Upgrade Self', description: 'Upgrade DAO contract' },
  { id: 'upgrade_remote', name: 'Upgrade Remote', description: 'Upgrade external contract' },
  { id: 'set_staking_contract', name: 'Set Staking Contract', description: 'Set token voting contract' },
  { id: 'add_bounty', name: 'Add Bounty', description: 'Create a new bounty' },
  { id: 'bounty_done', name: 'Bounty Done', description: 'Mark bounty as complete' },
  { id: 'vote', name: 'Vote (Signaling)', description: 'Non-binding vote' },
  { id: 'factory_info_update', name: 'Factory Info Update', description: 'Update factory settings' },
  { id: 'policy_add_or_update_role', name: 'Add/Update Role', description: 'Granular role changes' },
  { id: 'policy_remove_role', name: 'Remove Role', description: 'Remove a role' },
  { id: 'policy_update_default_vote_policy', name: 'Update Vote Policy', description: 'Change voting rules' },
  { id: 'policy_update_parameters', name: 'Update Parameters', description: 'Change DAO parameters' },
];

export default function CreateProposalPage() {
  const [selectedType, setSelectedType] = useState(null);

  if (!selectedType) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Create Proposal</h1>
        <p className="mb-6">Select the type of proposal you want to create:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROPOSAL_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className="p-4 border rounded hover:border-blue-500 text-left"
            >
              <h3 className="font-bold">{type.name}</h3>
              <p className="text-sm text-gray-600">{type.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setSelectedType(null)}>← Back</button>
      <ProposalForm type={selectedType} />
    </div>
  );
}
```

**Deliverable:** Proposal type selector

---

### Step 4.2: Transfer Proposal Form

**File: `/prototype-ui/components/proposals/TransferForm.tsx`**

```typescript
export function TransferForm({ onSubmit }: { onSubmit: Function }) {
  const [tokenId, setTokenId] = useState(''); // Empty string = NEAR
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const proposal = {
      description,
      kind: {
        Transfer: {
          token_id: tokenId,
          receiver_id: receiverId,
          amount: utils.format.parseNearAmount(amount),
          msg: null
        }
      }
    };

    await onSubmit(proposal);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Transfer Proposal</h2>

      <FormField
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="Brief description of this transfer"
      />

      <FormField
        label="Token"
        value={tokenId}
        onChange={setTokenId}
        placeholder="Leave empty for NEAR, or enter token contract ID"
      />

      <FormField
        label="Receiver"
        value={receiverId}
        onChange={setReceiverId}
        placeholder="account.near"
        required
      />

      <FormField
        label="Amount"
        type="number"
        value={amount}
        onChange={setAmount}
        placeholder="10"
        required
      />

      <button type="submit" className="btn-primary mt-4">
        Create Proposal
      </button>
    </form>
  );
}
```

**Deliverable:** Working Transfer proposal form

---

### Step 4.3: Generic FunctionCall Form (CRITICAL)

**File: `/prototype-ui/components/proposals/FunctionCallForm.tsx`**

This is the most important form - it should support:
1. Contract ID input
2. Multiple actions
3. Each action has: method_name, args (JSON), gas, deposit
4. Base64 encoding of args
5. Add/remove actions
6. Argument validation

```typescript
export function FunctionCallForm({ onSubmit }: { onSubmit: Function }) {
  const [receiverId, setReceiverId] = useState('');
  const [description, setDescription] = useState('');
  const [actions, setActions] = useState<Action[]>([{
    method_name: '',
    args: '{}',
    deposit: '0',
    gas: '30000000000000'
  }]);

  const addAction = () => {
    setActions([...actions, {
      method_name: '',
      args: '{}',
      deposit: '0',
      gas: '30000000000000'
    }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: string, value: string) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate JSON args
    for (const action of actions) {
      try {
        JSON.parse(action.args);
      } catch (err) {
        alert(`Invalid JSON in action "${action.method_name}": ${err.message}`);
        return;
      }
    }

    // Encode args to base64
    const encodedActions = actions.map(action => ({
      method_name: action.method_name,
      args: btoa(action.args),
      deposit: action.deposit,
      gas: action.gas
    }));

    const proposal = {
      description,
      kind: {
        FunctionCall: {
          receiver_id: receiverId,
          actions: encodedActions
        }
      }
    };

    await onSubmit(proposal);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">Function Call Proposal</h2>

      <FormField
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="What does this proposal do?"
        required
      />

      <FormField
        label="Contract ID"
        value={receiverId}
        onChange={setReceiverId}
        placeholder="contract.near"
        required
      />

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-4">Actions</h3>

        {actions.map((action, index) => (
          <div key={index} className="border p-4 rounded mb-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">Action {index + 1}</h4>
              {actions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAction(index)}
                  className="text-red-600"
                >
                  Remove
                </button>
              )}
            </div>

            <FormField
              label="Method Name"
              value={action.method_name}
              onChange={(v) => updateAction(index, 'method_name', v)}
              placeholder="ft_transfer"
              required
            />

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Arguments (JSON)
              </label>
              <textarea
                value={action.args}
                onChange={(e) => updateAction(index, 'args', e.target.value)}
                className="w-full border rounded p-2 font-mono text-sm"
                rows={6}
                placeholder='{"receiver_id": "alice.near", "amount": "1000000"}'
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter valid JSON. Will be Base64 encoded automatically.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormField
                label="Gas (yoctoGas)"
                value={action.gas}
                onChange={(v) => updateAction(index, 'gas', v)}
                placeholder="30000000000000"
              />

              <FormField
                label="Deposit (yoctoNEAR)"
                value={action.deposit}
                onChange={(v) => updateAction(index, 'deposit', v)}
                placeholder="0"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addAction}
          className="btn-secondary w-full"
        >
          + Add Another Action
        </button>
      </div>

      <button type="submit" className="btn-primary w-full">
        Create Proposal
      </button>
    </form>
  );
}
```

**Deliverable:** Fully functional generic FunctionCall form

---

### Step 4.4: Forms for All Other Proposal Types

**Context for Claude:**
Create similar forms for each remaining proposal type. Use the same pattern:
1. Dedicated component file
2. Form validation
3. Proper TypeScript types
4. Submit to `onSubmit` callback

**Forms to Create:**

1. **`AddMemberToRoleForm.tsx`** - Simple form with member ID and role dropdown
2. **`RemoveMemberFromRoleForm.tsx`** - Member ID and role dropdown
3. **`ChangeConfigForm.tsx`** - Name, purpose, metadata (logo upload)
4. **`ChangePolicyForm.tsx`** - Full policy JSON editor (advanced)
5. **`UpgradeSelfForm.tsx`** - Contract hash input, verification
6. **`UpgradeRemoteForm.tsx`** - Contract ID, method name, hash
7. **`SetStakingContractForm.tsx`** - Staking contract ID, big warning about irreversibility
8. **`AddBountyForm.tsx`** - Bounty details, amount, deadline, times
9. **`BountyDoneForm.tsx`** - Bounty ID dropdown, receiver
10. **`VoteForm.tsx`** - Just description (signaling vote)
11. **`FactoryInfoUpdateForm.tsx`** - Factory info JSON
12. **`PolicyAddOrUpdateRoleForm.tsx`** - Role configuration
13. **`PolicyRemoveRoleForm.tsx`** - Role name
14. **`PolicyUpdateDefaultVotePolicyForm.tsx`** - Vote policy config
15. **`PolicyUpdateParametersForm.tsx`** - Bond, period, etc.

**Each form should:**
- Have clear labels and placeholders
- Include help text explaining what each field does
- Validate inputs before submission
- Show preview of what will be submitted
- Have consistent styling

**Deliverable:** Complete set of proposal creation forms

---

### Step 4.5: Proposal Submission Logic

**File: `/prototype-ui/lib/near/proposals.ts`**

Create helper functions to submit proposals:

```typescript
import { NearClient } from './client';

export async function createProposal(
  client: NearClient,
  daoId: string,
  proposal: { description: string; kind: ProposalKind }
) {
  const accountId = localStorage.getItem('accountId');
  const account = await client.near.account(accountId);

  const result = await account.functionCall({
    contractId: `${daoId}.sputnik-dao.near`,
    methodName: 'add_proposal',
    args: { proposal },
    gas: '300000000000000',
    attachedDeposit: '0' // Assuming 0 bond for prototype
  });

  return result;
}

export async function voteOnProposal(
  client: NearClient,
  daoId: string,
  proposalId: number,
  vote: 'Approve' | 'Reject' | 'Remove'
) {
  const accountId = localStorage.getItem('accountId');
  const account = await client.near.account(accountId);

  const result = await account.functionCall({
    contractId: `${daoId}.sputnik-dao.near`,
    methodName: 'act_proposal',
    args: {
      id: proposalId,
      action: `Vote${vote}`
    },
    gas: '300000000000000'
  });

  return result;
}
```

**Deliverable:** Proposal submission functions

---

## Phase 5: Voting & Finalization
**Goal:** Implement voting interface and proposal finalization

### Step 5.1: Vote Buttons Component

**File: `/prototype-ui/components/VoteButtons.tsx`**

```typescript
export function VoteButtons({ proposalId }: { proposalId: number }) {
  const [voting, setVoting] = useState(false);

  const handleVote = async (vote: 'Approve' | 'Reject' | 'Remove') => {
    setVoting(true);
    try {
      const client = new NearClient();
      await client.init(/* ... */);
      await voteOnProposal(client, 'treasury-dao', proposalId, vote);

      alert('Vote submitted successfully!');
      window.location.reload();
    } catch (err) {
      alert(`Error voting: ${err.message}`);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={() => handleVote('Approve')}
        disabled={voting}
        className="btn-primary"
      >
        ✓ Approve
      </button>
      <button
        onClick={() => handleVote('Reject')}
        disabled={voting}
        className="btn-danger"
      >
        ✗ Reject
      </button>
      <button
        onClick={() => handleVote('Remove')}
        disabled={voting}
        className="btn-secondary"
      >
        🗑 Remove
      </button>
    </div>
  );
}
```

**Deliverable:** Working vote buttons

---

### Step 5.2: Vote Results Display

**File: `/prototype-ui/components/VotesList.tsx`**

Display who voted and how:

```typescript
export function VotesList({ votes }: { votes: Record<string, Vote> }) {
  const voteEntries = Object.entries(votes);

  if (voteEntries.length === 0) {
    return <p className="text-gray-500">No votes yet</p>;
  }

  const counts = {
    Approve: 0,
    Reject: 0,
    Remove: 0
  };

  voteEntries.forEach(([_, vote]) => {
    counts[vote]++;
  });

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-4 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-700">{counts.Approve}</div>
          <div className="text-sm text-green-600">Approve</div>
        </div>
        <div className="p-4 bg-red-50 rounded">
          <div className="text-2xl font-bold text-red-700">{counts.Reject}</div>
          <div className="text-sm text-red-600">Reject</div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-gray-700">{counts.Remove}</div>
          <div className="text-sm text-gray-600">Remove</div>
        </div>
      </div>

      <h3 className="font-semibold mb-2">Voters:</h3>
      <ul className="space-y-2">
        {voteEntries.map(([accountId, vote]) => (
          <li key={accountId} className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs ${
              vote === 'Approve' ? 'bg-green-100 text-green-700' :
              vote === 'Reject' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {vote}
            </span>
            <span>{accountId}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Deliverable:** Vote results component

---

## Phase 6: Dashboard & Analytics
**Goal:** Create dashboard showing DAO overview

### Step 6.1: Dashboard Page

**File: `/prototype-ui/app/page.tsx`**

```typescript
export default async function HomePage() {
  const stats = await getDaoStats();
  const recentProposals = await getRecentProposals();

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Treasury DAO Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Proposals" value={stats.totalProposals} />
        <StatCard title="Active Proposals" value={stats.activeProposals} />
        <StatCard title="Total Members" value={stats.totalMembers} />
        <StatCard title="Treasury Balance" value={`${stats.balance} NEAR`} />
      </div>

      {/* Recent Proposals */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Recent Proposals</h2>
        <div className="grid gap-4">
          {recentProposals.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Deliverable:** Dashboard page

---

## Phase 7: Testing & Documentation

### Step 7.1: Create Test Scenarios

Create test file that exercises all proposal types:

**File: `/prototype-ui/tests/all-proposal-types.test.ts`**

Test creating and voting on each proposal type.

### Step 7.2: Write README

**File: `/prototype-ui/README.md`**

```markdown
# Treasury DAO Prototype UI

Complete Sputnik-DAO UI implementation with sandbox testing.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the prototype:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open http://localhost:3000

## Features

- ✅ All 17+ Sputnik-DAO proposal types
- ✅ Generic FunctionCall interface
- ✅ Local sandbox (no mainnet needed)
- ✅ Test accounts included
- ✅ Complete voting workflow

## Proposal Types Supported

1. Transfer - Send tokens
2. FunctionCall - Generic contract calls
3. ChangeConfig - Update DAO config
4. ChangePolicy - Update policy
5. AddMemberToRole - Add members
6. RemoveMemberFromRole - Remove members
7. UpgradeSelf - Upgrade DAO contract
8. UpgradeRemote - Upgrade external contracts
9. SetStakingContract - Token voting
10. AddBounty - Create bounties
11. BountyDone - Complete bounties
12. Vote - Signaling votes
13. FactoryInfoUpdate - Factory settings
14. PolicyAddOrUpdateRole - Granular role changes
15. PolicyRemoveRole - Remove roles
16. PolicyUpdateDefaultVotePolicy - Voting rules
17. PolicyUpdateParameters - DAO parameters
```

**Deliverable:** Complete documentation

---

## Summary for Claude

**You should now have:**
1. ✅ Next.js project with TypeScript & Tailwind
2. ✅ Custom NEAR sandbox server
3. ✅ Test accounts and DAO contract
4. ✅ Complete UI for ALL Sputnik-DAO proposal types
5. ✅ Generic FunctionCall interface (most important)
6. ✅ Voting and finalization
7. ✅ Dashboard and analytics
8. ✅ Full local testing capability

**To implement this:**
1. Follow each phase sequentially
2. Test each component as you build it
3. Reference the existing `/playwright-tests/` for contract interaction patterns
4. Ensure all proposal types work end-to-end
5. Focus especially on the Generic FunctionCall form (Phase 4.3)

**The prototype demonstrates:**
- Full Sputnik-DAO contract support
- No missing features (100% coverage)
- Local development without mainnet
- Modern, efficient tech stack
- Clear path to production implementation

---

## Part 6: Technical Considerations

### 6.1 Backward Compatibility
- All existing proposals must continue working
- Don't break current ChangePolicy implementation
- Add new proposal types alongside existing ones
- Provide migration guides

### 6.2 Permission System
- Each proposal type needs permission checks
- Update role configuration UI to show all proposal types
- Add permission templates for common roles

### 6.3 Proposal Details Rendering
- Each proposal type needs custom detail view
- Add JSON fallback for unknown types
- Show human-readable summaries

### 6.4 Testing Requirements
- Unit tests for each proposal type
- Integration tests for workflows
- E2E tests for critical paths
- Security audits for high-risk operations

### 6.5 Documentation Needs
- User guides for each feature
- Developer documentation
- Migration guides
- Best practices
- Security considerations

---

## Part 7: Security Considerations

### High-Risk Proposals (Require Extra Caution)
1. **UpgradeSelf** - Can break DAO entirely
2. **UpgradeRemote** - Can break dependent contracts
3. **SetStakingContract** - Irreversible governance change
4. **ChangePolicy** - Can lock out all members

### Recommended Safeguards
- **Higher approval thresholds** for risky proposals
- **Time delays** before execution
- **Simulation/dry-run** capabilities
- **Confirmation checklists** for dangerous operations
- **Rollback plans** and emergency procedures

### UI Security Patterns
- ⚠️ **Warning badges** for high-risk proposals
- 🔒 **Multi-step confirmations** for dangerous actions
- 📋 **Checklist requirements** before submission
- 👁️ **Preview/diff views** before execution
- ⏰ **Cooling-off periods** for major changes

---

## Part 8: User Education

### Educational Content Needed
1. **Proposal Type Guide**
   - When to use each proposal type
   - Examples and use cases
   - Common pitfalls

2. **Governance Best Practices**
   - Setting appropriate thresholds
   - Role design patterns
   - Security considerations

3. **Video Tutorials**
   - Creating different proposal types
   - Voting workflows
   - Advanced features

4. **In-App Help**
   - Tooltips for complex fields
   - Contextual help panels
   - Links to documentation

---

## Part 9: Metrics & Success Criteria

### Key Performance Indicators (KPIs)
1. **Feature Adoption**
   - % of DAOs using new proposal types
   - Number of proposals per type
   - Time to create proposals (should decrease)

2. **Error Reduction**
   - % decrease in failed proposals
   - % decrease in policy errors
   - Support ticket reduction

3. **User Satisfaction**
   - Feature request reduction for implemented features
   - Positive feedback on new workflows
   - User retention and growth

4. **Security**
   - No critical security incidents
   - Reduction in risky full policy changes
   - Increase in granular changes

---

## Conclusion

The Sputnik-DAO contract provides a rich set of governance features, but the NEAR Treasury UI currently implements only about 36% of available functionality. This gap represents significant opportunity for enhancement.

### Key Takeaways
1. **Critical gap:** No generic FunctionCall interface exists, severely limiting DAO flexibility
2. **5 major proposal types** are well-implemented with comprehensive UIs (FunctionCall only partially)
3. **9+ proposal types** remain unimplemented
4. **Generic FunctionCall** is highest priority - unlocks DeFi, NFT, and custom contract interactions
5. **Granular policy changes** would significantly improve safety
6. **Bounty system** could transform community engagement
7. **Signaling votes** would enable better governance
8. **Advanced features** (UpgradeRemote, SetStakingContract) serve niche but important use cases

### Recommended Next Steps
1. ✅ Review this document with design and product teams
2. ✅ Prioritize features based on user research
3. ✅ Start with Phase 1 (Safety & Simplicity)
4. ✅ Gather user feedback throughout implementation
5. ✅ Iterate based on real-world usage

---

## Appendices

### A. Resources
- [Sputnik-DAO Contract Repository](https://github.com/near-daos/sputnik-dao-contract)
- [Sputnik-DAO Documentation](https://github.com/near-daos/sputnik-dao-contract/blob/main/README.md)
- [NEAR Treasury UI Repository](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard)

### B. Contact
For questions about this document or feature implementation:
- GitHub Issues: https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard/issues
- Documentation: https://docs.neartreasury.com

### C. Document History
- **v1.0** (2025-10-13): Initial comprehensive analysis

---

**End of Document**
