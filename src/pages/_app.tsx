import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import ThemeToggle from "src/components/ThemeToggle";
import ToastContainer from "src/components/ToastContainer";
import { trpc } from "src/utils/trpc";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="title" content="misorter" />
        <meta lang="en" />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </Head>
      <Script
        async
        src="https://umami-sonastea.vercel.app/script.js"
        data-cache="true"
        data-domains="www.misorter.com,misorter.com"
        data-website-id="9147fb3a-6922-4859-8bb8-d98d54ebc2fa"
      />
      <ThemeToggle />
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={true}
        closeOnClick
        theme="dark"
        draggable
        toastClassName="toastBody"
      />
      <Component {...pageProps} />
    </>
  );
}

export { withAxiom } from "next-axiom";
export default trpc.withTRPC(MyApp);
