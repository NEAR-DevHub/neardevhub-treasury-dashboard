function getApproversGroup(){

const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
const groupWithTransferPermission = (daoPolicy.roles ?? []).filter((role) => {
    const transferPermissions = [
      "transfer:*",
      "transfer:VoteApprove",
      "transfer:VoteReject",
      "transfer:VoteRemove",
    ];
    return (role?.permissions ?? []).some((i) => transferPermissions.includes(i));
  });
  
  let approversGroup = [];
  groupWithTransferPermission.map(
    (i) => (approversGroup = approversGroup.concat(i.kind.Group))
  );
  return approversGroup
}

return {
    getApproversGroup
}