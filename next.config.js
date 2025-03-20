import { withAxiom } from "next-axiom";

module.exports = withAxiom(
  withPWA({
    reactStrictMode: true,
  })
);
