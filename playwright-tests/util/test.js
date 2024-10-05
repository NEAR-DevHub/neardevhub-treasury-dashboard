import { test as base } from "@playwright/test";

export const test = base.extend({
  instanceAccount: ["treasury-devdao.near", { option: true }],
});
