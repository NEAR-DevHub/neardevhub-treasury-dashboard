export async function getTransactionModalObject(page) {   
    return await JSON.parse(await page.locator("div.modal-body code").innerText());
}