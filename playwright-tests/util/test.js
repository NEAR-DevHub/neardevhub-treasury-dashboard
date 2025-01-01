import { test as base } from "@playwright/test";

export const test = base.extend({
  instanceAccount: ["treasury-devdao.near", { option: true }],
  daoAccount: ["devdao.sputnik-dao.near", { option: true }],
  lockupContract: ["devdao.lockup.near", { option: true }],
  factoryAccount: ["treasury-factory.near", { option: true }],
});
