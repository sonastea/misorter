import { setCookie } from "cookies-next";
import { useEffect, useState } from "react";
import { trpc } from "src/utils/trpc";
import CreatePollButton from "./CreatePollButton";
import CreatePollUnauthorizedButton from "./CreatePollUnauthorizedButton";

const CreatePollButtonContainer = () => {
  const [isLoggedIn, setLoggedIn] = useState<boolean>(false);
  let code: string = "";

  useEffect(() => {
    fetch("/api/twitch-validate", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.status !== 401) {
          setLoggedIn(true);
        }
      });
  }, []);

  if (typeof window !== "undefined" && sessionStorage) {
    code = sessionStorage.getItem("twitch_auth_code") as string;
  }
  const getAccessToken = trpc.useQuery(["twitch.get-token", code], {
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: false,
  });

  useEffect(() => {
    if (code && !isLoggedIn) {
      getAccessToken
        .refetch()
        .then((res) =>
          setCookie("Authorization", `Bearer ${res.data?.access_token}`)
        )
        .finally(() => sessionStorage.removeItem("twitch_auth_code"));
      setLoggedIn(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (isLoggedIn) {
    return <CreatePollButton />;
  }

  return <CreatePollUnauthorizedButton />;
};

export default CreatePollButtonContainer;
