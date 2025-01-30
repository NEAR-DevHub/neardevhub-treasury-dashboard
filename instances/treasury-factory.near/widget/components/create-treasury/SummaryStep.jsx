const { TransactionLoader } = VM.require(
  `${REPL_DEVDAO_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { formFields } = props;

const REQUIRED_BALANCE = 9;

const [showCongratsModal, setShowCongratsModal] = useState(false);
const [showErrorToast, setShowErrorToast] = useState(false);
const [isTxnCreated, setTxnCreated] = useState(false);

const Section = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  border-bottom: ${(props) => (props.withBorder ? "1px solid #E2E6EC" : "0")};

  label {
    font-size: 12px;
    color: #999999;
    margin-bottom: 5px;
  }

  i {
    font-size: 18px;
    color: #060606;
  }

  ul {
    margin: 0;
    padding: 0;

    li {
      list-style: none;
      padding: 8px 0;
      border-bottom: 1px solid #e2e6ec;

      &:last-child {
        border: 0;
      }
    }
  }
`;

const Badge = styled.div`
  border: 1px solid #e2e6ec;
  border-radius: 32px;
  padding: 4px 10px;
`;

const Item = styled.div`
  border-bottom: 1px solid #e2e6ec;
  padding: 10px 0;

  &:last-child {
    border: 0;
  }
`;

const WidgetItemLink = styled.div`
  border-bottom: 1px solid #e2e6ec;
  padding: 10px 0;

  &:last-child {
    border: 0;
  }

  small {
    font-size: 12px;
    font-weight: 500;
    line-height: 15px;
    color: #b3b3b3;
  }

  span {
    font-size: 14px;
  }

  a {
    color: #060606;
  }
`;

const PERMISSIONS = {
  create: "Create",
  edit: "Edit",
  vote: "Vote",
};

const storageAccountName = useMemo(() => Storage.privateGet("accountName"));

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;
    let errorTimeout = null;

    const checkAccountCreation = async () => {
      Near.asyncView(`${storageAccountName}.near`, "web4_get", {
        request: { path: "/" },
      })
        .then((web4) => {
          if (web4) {
            setTxnCreated(false);
            setShowCongratsModal(true);
            clearTimeout(errorTimeout);
            clearTimeout(checkTxnTimeout);
          } else {
            checkTxnTimeout = setTimeout(checkAccountCreation, 1000);
          }
        })
        .catch(() => {
          checkTxnTimeout = setTimeout(checkAccountCreation, 1000);
        });
    };
    checkAccountCreation();

    // if in 25 seconds there is no change, show error condition
    errorTimeout = setTimeout(() => {
      setShowErrorToast(true);
      setTxnCreated(false);
      clearTimeout(checkTxnTimeout);
    }, 25_000);

    return () => {
      clearTimeout(checkTxnTimeout);
      clearTimeout(errorTimeout);
    };
  }
}, [isTxnCreated]);

function filterMemberByPermission(permission) {
  return formFields.members
    .filter((acc) => acc.permissions.includes(permission))
    .map((acc) => acc.accountId);
}

// Permissions are set using https://github.com/near-daos/sputnik-dao-contract/blob/main/sputnikdao2/src/proposals.rs#L119
function createDao() {
  setTxnCreated(true);
  const createDaoConfig = {
    config: {
      name: `${formFields.accountName}`,
      purpose: `creating ${formFields.accountName} treasury`,
      metadata: "",
    },
    policy: {
      roles: [
        {
          kind: {
            Group: filterMemberByPermission(PERMISSIONS.create),
          },
          name: "Create Requests",
          permissions: ["call:AddProposal", "transfer:AddProposal"],
          vote_policy: {},
        },
        {
          kind: {
            Group: filterMemberByPermission(PERMISSIONS.edit),
          },
          name: "Manage Members",
          permissions: [
            "config:*",
            "policy:*",
            "add_member_to_role:*",
            "remove_member_from_role:*",
            "upgrade_self:*",
            "upgrade_remote:*",
            "set_vote_token:*",
            "add_bounty:*",
            "bounty_done:*",
            "factory_info_update:*",
            "policy_add_or_update_role:*",
            "policy_remove_role:*",
            "policy_update_default_vote_policy:*",
            "policy_update_parameters:*",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: filterMemberByPermission(PERMISSIONS.vote),
          },
          name: "Vote",
          permissions: [
            "*:VoteReject",
            "*:VoteApprove",
            "*:VoteRemove",
            "*:RemoveProposal",
            "*:Finalize",
          ],
          vote_policy: {},
        },
      ],
      default_vote_policy: {
        weight_kind: "RoleWeight",
        quorum: "0",
        threshold: [1, 2],
      },
      proposal_bond: "100000000000000000000000",
      proposal_period: "604800000000000",
      bounty_bond: "100000000000000000000000",
      bounty_forgiveness_period: "604800000000000",
    },
  };

  Near.call([
    {
      contractName: `${REPL_BASE_DEPLOYMENT_ACCOUNT}`,
      methodName: "create_instance",
      args: {
        name: `${formFields.accountName}`,
        sputnik_dao_factory_account_id: `${REPL_SPUTNIK_FACTORY_ACCOUNT}`,
        social_db_account_id: `${REPL_SOCIAL_CONTRACT}`,
        widget_reference_account_id: `${REPL_FACTORY_REFERENCE_ACCOUNT}`,
        create_dao_args: btoa(JSON.stringify(createDaoConfig)),
      },
      gas: 300000000000000,
      deposit: Big(REQUIRED_BALANCE).mul(Big(10).pow(24)).toFixed(),
    },
  ]);

  Storage.privateSet("accountName", formFields.accountName);
}

const CongratsItem = ({ title, link }) => (
  <WidgetItemLink className="d-flex flex-column gap-2">
    <small>{title}</small>
    <div className="d-flex justify-content-between align-items-center">
      <span>{link}</span>
      <div className="d-flex gap-2 align-items-center">
        <i
          role="button"
          className="bi bi-copy"
          onClick={() => clipboard.writeText(link)}
        />
        <a target="_blank" href={link}>
          <i className="bi bi-box-arrow-up-right" />
        </a>
      </div>
    </div>
  </WidgetItemLink>
);

const SummaryListItem = ({ title, value, info }) => (
  <li className="d-flex align-items-center justify-content-between w-100">
    <div>
      {title}
      {info && (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tooltip">{info}</Tooltip>}
        >
          <i className="mx-1 bi bi-info-circle text-secondary" />
        </OverlayTrigger>
      )}
    </div>
    {value} NEAR
  </li>
);

const ListItem = ({ member }) => (
  <Item className="d-flex align-items-center w-100">
    <div className="w-50">
      <Widget
        src="mob.near/widget/Profile.ShortInlineBlock"
        props={{
          accountId: member.accountId,
        }}
      />
    </div>

    <div className="d-flex gap-2 align-items-center">
      {member.permissions.map((permission, i) => (
        <Badge key={i}>{permission}</Badge>
      ))}
    </div>
  </Item>
);

return (
  <>
    <TransactionLoader
      showInProgress={isTxnCreated}
      showError={showErrorToast}
      toggleToast={() => setShowErrorToast(false)}
    />
    <div className="d-flex flex-column w-100 gap-3">
      <h3>Summary</h3>

      <div>
        <h4>General</h4>
        <Section withBorder>
          <label>Your Wallet</label>
          <Widget
            src="mob.near/widget/Profile.ShortInlineBlock"
            props={{
              accountId: context.accountId,
            }}
          />
        </Section>
      </div>

      <div>
        <Section withBorder>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <label>Applicatiion Account name</label>
              <div>
                {formFields.accountName
                  ? `${formFields.accountName}.near`
                  : "-"}
              </div>
            </div>

            <Link
              href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=1`}
            >
              <i className="bi bi-pencil" />
            </Link>
          </div>
        </Section>

        <Section withBorder>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <label>Sputnik Account Name</label>
              <div>
                {formFields.accountName
                  ? `${formFields.accountName}.sputnik-dao.near`
                  : "-"}
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Section>
        <div className="d-flex justify-content-between align-items-center">
          <h4>Members and permissions</h4>
          <Link
            href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=2`}
          >
            <i className="bi bi-pencil" />
          </Link>
        </div>
        {formFields.members && (
          <Section>
            <div className="d-flex flex-column w-100">
              {formFields.members.map((member, i) => (
                <ListItem key={i} member={member} />
              ))}
            </div>
          </Section>
        )}
      </Section>

      <Section>
        <h4>Costs</h4>
        <ul>
          <SummaryListItem
            title="SputnikDAO"
            value={6}
            info="Estimated one-time costs to store info in SputnikDAO"
          />
          <SummaryListItem
            title="Frontend BOS Widget Hosting"
            value={3}
            info="Estimated one-time costs to store info in BOS"
          />
          <b>
            <SummaryListItem title="Total" value={REQUIRED_BALANCE} />
          </b>
        </ul>
      </Section>

      <button
        className="btn btn-primary w-100"
        onClick={createDao}
        disabled={!formFields.members || !formFields.accountName}
      >
        Confirm and Create
      </button>
    </div>

    {showCongratsModal && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
        props={{
          isOpen: true,
          heading: "Congrats! Your Treasury is ready",
          content: (
            <div className="d-flex flex-column gap-3">
              <p>
                You can access and manage your treasury using any of these
                gateways.
              </p>
              <div>
                <CongratsItem
                  title="near.org"
                  link={`https://near.org/${storageAccountName}.near/widget/app`}
                />
                <CongratsItem
                  title="near.social"
                  link={`https://social.near/${storageAccountName}.near/widget/app`}
                />
                <CongratsItem
                  title="web4"
                  link={`https://${storageAccountName}.near.page`}
                />
              </div>
            </div>
          ),
          onClose: () => setShowCongratsModal(false),
        }}
      />
    )}
  </>
);
