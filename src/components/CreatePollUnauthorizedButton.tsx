const clientId = import.meta.env.VITE_CLIENT_ID;

// URL-safe alphabet (base64url), matching crypto-random-string's "url-safe"
// output: 9 chars x 6 bits = 54 bits of entropy per OAuth state value.
const STATE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const STATE_LENGTH = 9;

const generateOAuthState = (length: number = STATE_LENGTH): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // 256 % 64 === 0, so masking introduces no modulo bias.
  let state = "";
  for (const byte of bytes) {
    state += STATE_ALPHABET[byte & 63];
  }
  return state;
};

const CreatePollUnauthorizedButton = ({
  isLoggedIn,
}: {
  isLoggedIn: boolean | undefined;
}) => {
  const handleClick = () => {
    // Fresh state per attempt: module-scope secrets are shared across
    // renders and defeat the OAuth state's CSRF purpose.
    const state = generateOAuthState();

    if (!isLoggedIn) {
      sessionStorage.setItem("state", state);
      sessionStorage.setItem("back-url", window.location.toString());
    }

    location.href = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${window.location.origin}&scope=channel%3Amanage%3Apolls&state=${state}`;
  };

  return (
    <button
      aria-label="Sign in through twitch to create polls"
      className="sort-pollContainer"
      type="button"
      title="Sign in through twitch to create polls"
      onClick={handleClick}
    >
      <svg className="sort-pollUnauthorized" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z"
        />
      </svg>
    </button>
  );
};

export default CreatePollUnauthorizedButton;
