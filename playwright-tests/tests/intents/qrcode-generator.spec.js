import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { Jimp } from "jimp";
import jsQR from "jsqr";
import nearApi from "near-api-js";

test("qr code generator produces correct QR", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
  });
  await page.goto(`https://${instanceAccount}.page/`);

  const depositButton = page.getByRole("button", {
    name: "Deposit",
  });
  await expect(depositButton).toBeVisible();

  const showAndDecodeQRCode = async (text) => {
    await page.evaluate(
      ({ text }) => {
        document.querySelector("near-social-viewer").remove();
        const viewer = document.createElement("near-social-viewer");
        viewer.setAttribute(
          "initialProps",
          JSON.stringify({
            text,
          })
        );
        viewer.setAttribute(
          "src",
          "widgets.treasury-factory.near/widget/components.QRCodeGenerator"
        );
        document.body.appendChild(viewer);
      },
      { text }
    );
    const qrCodeIframe = page.locator("iframe[title*='QR Code for']");
    await expect(qrCodeIframe).toBeVisible();

    const qrCodeImageBuffer = await qrCodeIframe.screenshot({
      path: "qrcode.png",
    });
    const image = await Jimp.read(qrCodeImageBuffer);

    const imageData = {
      data: new Uint8ClampedArray(image.bitmap.data),
      width: image.bitmap.width,
      height: image.bitmap.height,
    };

    // Use jsQR to decode the QR code
    const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);
    return decodedQR?.chunks[0].text;
  };
  expect(await showAndDecodeQRCode(daoAccount)).toEqual(daoAccount);
  expect(await showAndDecodeQRCode("Random qr coded text")).toEqual(
    "Random qr coded text"
  );

  const implicitAccount = Buffer.from(
    nearApi.utils.KeyPairEd25519.fromRandom().getPublicKey().data
  ).toString("hex");

  expect(await showAndDecodeQRCode(implicitAccount)).toEqual(implicitAccount);
});
