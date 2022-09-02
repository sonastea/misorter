import cryptoRandomString from "crypto-random-string";
import { useEffect } from "react";
import styles from "../styles/Sort.module.css";

const clientId = process.env.NEXT_PUBLIC_clientId;
const secret = cryptoRandomString({ length: 9, type: "url-safe" });

const CreatePollUnauthorizedButton = ({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) => {
  const twitchAuth = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${window.location.origin}&scope=channel%3Amanage%3Apolls&state=${secret}`;

  if (!isLoggedIn) {
    sessionStorage.setItem("state", secret);
  }

  return (
    <button
      aria-label="Sign in through twitch to create polls"
      className={styles.pollContainer}
      type="button"
      title="Sign in through twitch to create polls"
      onClick={() => (location.href = twitchAuth)}
    >
      <svg className={styles.pollUnauthorized} viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z"
        />
      </svg>
    </button>
  );
};

export default CreatePollUnauthorizedButton;
