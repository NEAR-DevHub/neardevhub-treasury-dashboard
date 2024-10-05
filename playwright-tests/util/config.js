export async function getInstanceConfig({ page, instanceAccount }) {
  await page.goto(`/${instanceAccount}/widget/config.data`);
  const config = JSON.parse(
    await page.locator("near-social-viewer").innerText()
  );
  return config;
}
