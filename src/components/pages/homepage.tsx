// Welcome to the home page of the first TypeScript BOS component!

// TypeScript! Yay!
interface Props {
  customWelcomeMessage?: string;
}

// Just create a default export function (no need to `return` it, see `.bos`
// folder after `npm run build` if you want to understand what is happening)
export default function (props: Props, context: BosContext) {
  return (
    <>
      <h1>
       </h1>
    </>
  );
}
