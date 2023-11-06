/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  disable: process.env.NODE_ENV === "development",
  dest: "public",
});

const { withAxiom } = require("next-axiom");

module.exports = withAxiom(
  withPWA({
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
      webpackBuildWorker: true,
    }
  })
);
