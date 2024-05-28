import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { deleteCookie, getCookie } from "cookies-next";
import { useState } from "react";
import { toast } from "react-toastify";
import styles from "../styles/Sort.module.css";

const CreatePollButton = ({
  option1,
  option2,
}: {
  option1: string;
  option2: string;
}) => {
  const [title, setTitle] = useState<string>(`${option1} or ${option2}`);
  const [newOption1, setNewOption1] = useState<string>(option1);
  const [newOption2, setNewOption2] = useState<string>(option2);
  const [duration, setDuration] = useState<number>(15);

  const handleCreatePoll = async () => {
    const userId = sessionStorage.getItem("twitch_user_id");
    const clientId = process.env.NEXT_PUBLIC_clientId!;
    const choices: { title: string }[] = [
      { title: newOption1 },
      { title: newOption2 },
    ];

    if (duration < 15) {
      setDuration(15);
    }

    const data = await fetch("https://api.twitch.tv/helix/polls", {
      method: "POST",
      headers: {
        Authorization: `${getCookie("Authorization")}`,
        "Client-Id": clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        broadcaster_id: userId,
        title: title,
        choices: choices,
        duration: duration,
      }),
    }).then((res) => res.json());

    if (data.status === 401) {
      toast.error("Unauthorized to create poll");
      deleteCookie("Authorization");
    }

    if (data.status === 403) {
      toast.error("Unable to create poll due to permissions");
    }

    if (data[0] && data[0].status === "ACTIVE") {
      toast.success("Successfully created poll");
    }
  };

  return (
    <>
      <Popover className={styles.pollPopover}>
        <PopoverButton
          aria-label="Create a twitch poll"
          className={styles.pollContainer}
          type="button"
          title="Create a twitch poll"
        >
          <svg className={styles.poll} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M9 17H7V10H9V17M13 17H11V7H13V17M17 17H15V13H17V17M19 19H5V5H19V19.1M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"
            />
          </svg>
        </PopoverButton>

        <PopoverPanel className={styles.pollPanel}>
          {({ close }) => (
            <form className={styles.pollForm}>
              <label className={styles.pollLabels}>
                Poll Title
                <input
                  className={styles.pollInput}
                  placeholder={`${option1} vs ${option2}`}
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                />
              </label>
              <label className={styles.pollLabels}>
                Options
                <input
                  className={styles.pollInput}
                  value={newOption1}
                  onChange={(e) => setNewOption1(e.target.value)}
                />
                <input
                  className={styles.pollInput}
                  value={newOption2}
                  onChange={(e) => setNewOption2(e.target.value)}
                />
              </label>
              <label className={styles.pollLabels}>
                Duration
                <input
                  type="number"
                  className={styles.pollInput}
                  step="5"
                  min="0"
                  max="1800"
                  value={duration}
                  onChange={(e) => {
                    setDuration(parseInt(e.target.value));

                    if (parseInt(e.target.value) > 1800) {
                      setDuration(1800);
                    }

                    if (isNaN(parseInt(e.target.value))) {
                      setDuration(15);
                    }
                  }}
                />
              </label>
              <div>
                <button
                  className={styles.pollCancel}
                  type="button"
                  aria-label="Cancel creating twitch poll"
                  onClick={() => close()}
                >
                  Cancel
                </button>{" "}
                <button
                  className={styles.pollConfirm}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCreatePoll();
                  }}
                >
                  Confirm
                </button>
              </div>
            </form>
          )}
        </PopoverPanel>
      </Popover>
    </>
  );
};

export default CreatePollButton;
