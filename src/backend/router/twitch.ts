import { publicProcedure, router } from "src/backend/trpc";
import { z } from "zod";

let clientId: string = "";
let clientSecret: string = "";
let redirectUri: string = "";

if (process.env.NEXT_PUBLIC_clientId) {
  clientId = process.env.NEXT_PUBLIC_clientId;
}

if (process.env.NEXT_PUBLIC_clientSecret) {
  clientSecret = process.env.NEXT_PUBLIC_clientSecret;
}

if (process.env.redirectUri) {
  redirectUri = process.env.redirectUri;
}

export const twitchRouter = router({
  getToken: publicProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const data = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: input,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }).then((res) => res.json());
      return { access_token: data.access_token };
    } catch (error) {
      console.log(error);
    }
  }),
});
