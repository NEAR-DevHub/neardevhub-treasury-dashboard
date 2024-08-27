import html from "./index.html.js";

export function web4_get() {
  const response = {
    contentType: "text/html; charset=UTF-8",
    body: env.base64_encode(html),
  };
  env.value_return(JSON.stringify(response));
}
