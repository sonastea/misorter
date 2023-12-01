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
        data-website-id="730953c9-2827-4a1f-a69a-6854b708fc9e"
        data-domains="misorter.com"
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

export default trpc.withTRPC(MyApp);
