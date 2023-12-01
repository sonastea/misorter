import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" data-theme="light">
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/favicon.ico" />
          <meta name="theme-color" content="#ff5fa2" />
          <script
            async
            src="https://umami-sonastea.vercel.app/script.js"
            data-website-id="730953c9-2827-4a1f-a69a-6854b708fc9e"
            data-domains="misorter.com"
          ></script>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
