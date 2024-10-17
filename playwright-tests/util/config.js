import { expect } from "@playwright/test";

export async function getInstanceConfig({ page, instanceAccount }) {
  await page.goto(`/${instanceAccount}/widget/config.data`);
  const viewerElement = await page.locator("near-social-viewer pre");
  await expect(viewerElement).toBeAttached({ timeout: 20_000 });
  const config = JSON.parse(await viewerElement.innerText());
  return config;
}
