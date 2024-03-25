/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  disable: process.env.NODE_ENV === "development",
  dest: "public",
});

const { withAxiom } = require("next-axiom");

module.exports = withAxiom(
  withPWA({
    reactStrictMode: true,
    swcMinify: true,
  })
);
