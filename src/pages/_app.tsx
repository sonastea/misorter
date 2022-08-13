import { AppRouter } from "@router/index";
import { withTRPC } from "@trpc/next";
import type { AppProps } from "next/app";
import { ToastContainer } from "react-toastify";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
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

function getBaseUrl() {
  if (typeof window === "undefined") return ""; // Browser should use current path
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`; // SSR should use vercel url

  return `http://${window.location.hostname}:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
}

export default withTRPC<AppRouter>({
  config() {
    const url = `${getBaseUrl()}/api/trpc`;

    return {
      url,
    };
  },
  ssr: false,
})(MyApp);
