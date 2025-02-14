const { TransactionLoader } = VM.require(
  `${REPL_DEVDAO_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { formFields, setShowCongratsModal } = props;

const REQUIRED_BALANCE = 9;

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
  font-size: 12px;
  padding: 4px 8px;
`;

const Item = styled.div`
  border-bottom: 1px solid #e2e6ec;
  padding: 10px 0;

  &:last-child {
    border: 0;
  }
`;

const PERMISSIONS = {
  create: "Requestor",
  edit: "Admin",
  vote: "Approver",
};

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkAccountCreation = async () => {
      Near.asyncView(`${formFields.accountName}.near`, "web4_get", {
        request: { path: "/" },
      })
        .then((web4) => {
          if (web4) {
            setTxnCreated(false);
            setShowCongratsModal(true);
            clearTimeout(checkTxnTimeout);
            Storage.set("TreasuryAccountName", formFields.accountName);
          } else {
            checkTxnTimeout = setTimeout(checkAccountCreation, 1000);
          }
        })
        .catch(() => {
          checkTxnTimeout = setTimeout(checkAccountCreation, 1000);
        });
    };
    checkAccountCreation();

    return () => {
      clearTimeout(checkTxnTimeout);
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
  const oneRequiredVote = {
    weight_kind: "RoleWeight",
    quorum: "0",
    threshold: "1",
  };
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
          name: "Requestor",
          permissions: [
            "call:AddProposal",
            "transfer:AddProposal",
            "call:VoteRemove",
            "transfer:VoteRemove",
          ],
          vote_policy: {
            transfer: oneRequiredVote,
            call: oneRequiredVote,
          },
        },
        {
          kind: {
            Group: filterMemberByPermission(PERMISSIONS.edit),
          },
          name: "Admin",
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
          vote_policy: {
            config: oneRequiredVote,
            policy: oneRequiredVote,
            add_member_to_role: oneRequiredVote,
            remove_member_from_role: oneRequiredVote,
            upgrade_self: oneRequiredVote,
            upgrade_remote: oneRequiredVote,
            set_vote_token: oneRequiredVote,
            add_bounty: oneRequiredVote,
            bounty_done: oneRequiredVote,
            factory_info_update: oneRequiredVote,
            policy_add_or_update_role: oneRequiredVote,
            policy_remove_role: oneRequiredVote,
            policy_update_default_vote_policy: oneRequiredVote,
            policy_update_parameters: oneRequiredVote,
          },
        },
        {
          kind: {
            Group: filterMemberByPermission(PERMISSIONS.vote),
          },
          name: "Approver",
          permissions: [
            "call:VoteReject",
            "call:VoteApprove",
            "call:RemoveProposal",
            "call:Finalize",
            "transfer:VoteReject",
            "transfer:VoteApprove",
            "transfer:RemoveProposal",
            "transfer:Finalize",
          ],
          vote_policy: {
            transfer: oneRequiredVote,
            call: oneRequiredVote,
          },
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
}

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
  <Item className="d-flex align-items-center justify-content-between w-100 gap-3">
    <div style={{ width: "40%" }}>
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
        props={{ accountId: member.accountId }}
      />
    </div>

    <div className="d-flex gap-2 align-items-center" style={{ width: "292px" }}>
      {member.permissions.map((permission, i) => (
        <Badge key={i}>{permission}</Badge>
      ))}
    </div>
  </Item>
);

return (
  <>
    <TransactionLoader
      cancelTxn={() => setTxnCreated(false)}
      showInProgress={isTxnCreated}
    />
    <div className="d-flex flex-column w-100 gap-3">
      <h3>Summary</h3>
      <div>
        <h4>General</h4>
        <Section withBorder>
          <label>Your Wallet</label>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
            props={{ accountId: context.accountId }}
          />
        </Section>

        <div>
          <Section withBorder>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <label>Applicatiion Account Name</label>
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
      </div>

      <Section>
        <div className="d-flex justify-content-between align-items-center">
          <h4>Members and Permissions</h4>
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
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
          props={{
            type: "info",
            text: "The voting thresholds policy will be set to one vote by default for all permission groups. You can modify those later in the Settings.",
          }}
        />
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
        disabled={
          !formFields.members || !formFields.accountName || isTxnCreated
        }
      >
        Confirm and Create
      </button>
    </div>
  </>
);
