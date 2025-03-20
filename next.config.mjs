import { withAxiom } from "next-axiom";

const nextConfig = withAxiom(
  withPWA({
    reactStrictMode: true,
  })
);

export default nextConfig;
