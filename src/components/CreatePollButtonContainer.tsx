import { setCookie } from "cookies-next";
import { useEffect, useState } from "react";
import { trpc } from "src/utils/trpc";
import CreatePollButton from "./CreatePollButton";
import CreatePollUnauthorizedButton from "./CreatePollUnauthorizedButton";

const CreatePollButtonContainer = ({
  option1,
  option2,
}: {
  option1: string;
  option2: string;
}) => {
  const [isLoggedIn, setLoggedIn] = useState<boolean | null>(null);
  let code: string | null = "";

  useEffect(() => {
    const validate = () => fetch("/api/twitch-validate", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.status !== 401) {
          sessionStorage.setItem("twitch_user_id", data.user_id);
          setLoggedIn(true);
        } else {
          setLoggedIn(false);
        }
      });

    if (!isLoggedIn && !sessionStorage.getItem("twitch_auth_code")) {
      validate();
    }

  }, []);

  if (typeof window !== "undefined" && sessionStorage) {
    code = sessionStorage.getItem("twitch_auth_code");
  }
  const getAccessToken = trpc.useQuery(["twitch.get-token", code as string], {
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
        .then((res) => {
          setCookie("Authorization", `Bearer ${res.data?.access_token}`)
        })
        .finally(() => {
          sessionStorage.removeItem("twitch_auth_code");
          setLoggedIn(true);
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (isLoggedIn === null) return null;

  if (isLoggedIn) {
    return <CreatePollButton option1={option1} option2={option2} />;
  }

  return <CreatePollUnauthorizedButton isLoggedIn={isLoggedIn} />;
};

export default CreatePollButtonContainer;
