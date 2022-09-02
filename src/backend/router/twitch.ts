import * as trpc from "@trpc/server";
import { z } from "zod";

let clientId: string = "";
let clientSecret: string = "";

if (process.env.NEXT_PUBLIC_clientId) {
  clientId = process.env.NEXT_PUBLIC_clientId;
}

if (process.env.NEXT_PUBLIC_clientSecret) {
  clientSecret = process.env.NEXT_PUBLIC_clientSecret;
}

export const twitch = trpc.router().query("get-token", {
  input: z.string(),
  async resolve({ input }) {
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
          redirect_uri: window.location.origin,
        }),
      }).then((res) => res.json());
      return { access_token: data.access_token };
    } catch (error) {
      console.log(error);
    }
  },
});
