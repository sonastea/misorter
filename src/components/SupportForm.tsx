import { useMutation } from "@tanstack/react-query";
import { type SubmitEvent, useState, useEffect, Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { toast } from "react-toastify";
import { trpc } from "src/utils/trpc";

type SupportType = "help" | "feedback";

const topicOptions: Record<SupportType, string[]> = {
  help: ["General", "Other"],
  feedback: ["Feature request", "Bug report", "Other"],
};

const messagePlaceholders: Record<SupportType, string> = {
  help: "Describe what you need help with.",
  feedback: "Share any feedback or features you would like to see.",
};

const submitLabels: Record<SupportType, string> = {
  help: "Send for Help",
  feedback: "Send for Feedback",
};

const tabIndexMap: Record<SupportType, number> = {
  help: 0,
  feedback: 1,
};

const indexToTabMap: Record<number, SupportType> = {
  0: "help",
  1: "feedback",
};

const SupportForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<SupportType>("help");
  const [topic, setTopic] = useState(topicOptions.help[0]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 300;
      setIsVisible(window.scrollY < scrollThreshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const supportSubmit = useMutation({
    ...trpc.support.submit.mutationOptions(),
    onSuccess: () => {
      toast.success(`Thanks! Your ${type} was submitted.`);
      setMessage("");
      setEmail("");
      setTopic(topicOptions[type][0]);
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Could not submit your message.");
    },
  });

  const handleTabChange = (index: number) => {
    const nextType = indexToTabMap[index];
    setType(nextType);
    setTopic(topicOptions[nextType][0]);
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }

    const trimmedEmail = email.trim();

    supportSubmit.mutate({
      type,
      topic,
      message: trimmedMessage,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
    });
  };

  return (
    <div className="supportForm-container">
      <button
        type="button"
        className={`supportForm-trigger ${!isVisible ? "supportForm-trigger-hidden" : ""}`}
        onClick={() => setIsOpen(true)}
      >
        Help & Feedback
      </button>

      <Transition show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="supportForm-dialog"
          onClose={() => setIsOpen(false)}
        >
          <TransitionChild
            as={Fragment}
            enter="supportForm-backdrop-enter"
            enterFrom="supportForm-backdrop-enterFrom"
            enterTo="supportForm-backdrop-enterTo"
            leave="supportForm-backdrop-leave"
            leaveFrom="supportForm-backdrop-leaveFrom"
            leaveTo="supportForm-backdrop-leaveTo"
          >
            <div className="supportForm-backdrop" aria-hidden="true" />
          </TransitionChild>

          <div className="supportForm-panelContainer">
            <TransitionChild
              as={Fragment}
              enter="supportForm-panel-enter"
              enterFrom="supportForm-panel-enterFrom"
              enterTo="supportForm-panel-enterTo"
              leave="supportForm-panel-leave"
              leaveFrom="supportForm-panel-leaveFrom"
              leaveTo="supportForm-panel-leaveTo"
            >
              <DialogPanel className="supportForm-panel">
                <div className="supportForm-headerRow">
                  <DialogTitle as="h3" className="supportForm-title">
                    Help & Feedback Form
                  </DialogTitle>
                  <button
                    type="button"
                    className="supportForm-close"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close support form"
                  >
                    Close
                  </button>
                </div>

                <TabGroup
                  selectedIndex={tabIndexMap[type]}
                  onChange={handleTabChange}
                >
                  <TabList className="supportForm-typeToggle">
                    <Tab
                      className={({ selected }) =>
                        `supportForm-typeButton ${selected ? "supportForm-typeButton-active" : ""}`
                      }
                    >
                      Help
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        `supportForm-typeButton ${selected ? "supportForm-typeButton-active" : ""}`
                      }
                    >
                      Feedback
                    </Tab>
                  </TabList>
                </TabGroup>

                <form className="supportForm-form" onSubmit={onSubmit}>
                  <label className="supportForm-label" htmlFor="support-topic">
                    Topic
                  </label>
                  <select
                    id="support-topic"
                    className="supportForm-select"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    disabled={supportSubmit.isPending}
                  >
                    {topicOptions[type].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <label
                    className="supportForm-label"
                    htmlFor="support-message"
                  >
                    Message
                  </label>
                  <textarea
                    id="support-message"
                    className="supportForm-textarea"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={messagePlaceholders[type]}
                    minLength={10}
                    maxLength={2000}
                    required
                    disabled={supportSubmit.isPending}
                  />

                  <label className="supportForm-label" htmlFor="support-email">
                    Email (optional)
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    className="supportForm-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@example.com"
                    maxLength={255}
                    disabled={supportSubmit.isPending}
                  />

                  <p className="supportForm-note">
                    Please avoid sharing passwords or sensitive data.
                  </p>

                  <button
                    type="submit"
                    className="supportForm-submit"
                    disabled={supportSubmit.isPending}
                  >
                    {supportSubmit.isPending
                      ? "Sending..."
                      : submitLabels[type]}
                  </button>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default SupportForm;
