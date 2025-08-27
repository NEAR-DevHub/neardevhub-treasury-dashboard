const faqItems = [
  {
    question: "What is NEAR Intents and why is it useful?",
    answer:
      "NEAR Intents is a feature in the Treasury Dashboard that allows DAOs to manage assets and payment operations across multiple blockchains from a single interface. It enables organizations to accept deposits from different networks and request payouts in various cryptocurrencies while keeping everything in one place.",
  },
  {
    question: "How can I use my tokens on NEAR Intents?",
    answer:
      "You can manage all your tokens in one place and easily create payment requests. You can also store and control all your assets in a single dashboard and send payout requests.",
  },
  {
    question: "From which blockchains can I deposit using NEAR Intents?",
    answer: `You can make deposits from:
- Ethereum (ETH, USDC, USDT, WETH, AAVE, UNI)
- Bitcoin (BTC)
- Solana (SOL, USDC)
- Base (USDC, BRETT, DEGEN)
- Arbitrum (USDC, GMX, ARB)
- NEAR (wNEAR, REF, AURORA)
- XRP (XRP)
- TRON (TRX, USDT)`,
  },
  {
    question: "Which cryptocurrencies are supported in NEAR Intents?",
    answer: `Supported assets include:
- Native tokens: ETH, BTC, SOL, XRP, TRX
- Stablecoins: USDC, USDT, DAI
- DeFi tokens: AAVE, UNI, COMP
- NEAR ecosystem tokens: wNEAR, REF, AURORA
- Meme tokens: SHITZU, PEPE, DOGE`,
  },
  {
    question:
      "What should I do if the NEAR Intents wallet is not visible in my Treasury?",
    answer:
      "If you don’t see the NEAR Intents wallet, it means there are no tokens on it. To create it and make it visible on the Dashboard, you need to fund it using the form provided above.",
  },
];

State.init({
  openItems: new Set(),
});

const toggleItem = (index) => {
  const newOpenItems = new Set(state.openItems);
  if (newOpenItems.has(index)) {
    newOpenItems.delete(index);
  } else {
    newOpenItems.add(index);
  }
  State.update({ openItems: newOpenItems });
};

return (
  <div
    className="border border-1 rounded-4 p-3"
    style={{ backgroundColor: "var(--grey-05)" }}
  >
    <div className="h5 fw-bold mb-0">FAQ</div>
    {faqItems.map((item, index) => (
      <Widget
        key={index}
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FAQAccordion"
        props={{
          question: item.question,
          answer: item.answer,
          isOpen: state.openItems.has(index),
          onToggle: () => toggleItem(index),
          isLast: index === faqItems.length - 1, // Add this line
        }}
      />
    ))}
  </div>
);
