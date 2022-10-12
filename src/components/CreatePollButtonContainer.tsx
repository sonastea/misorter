import CreatePollButton from "./CreatePollButton";
import CreatePollUnauthorizedButton from "./CreatePollUnauthorizedButton";

const CreatePollButtonContainer = ({
  isLoggedIn,
  option1,
  option2,
}: {
  isLoggedIn: boolean | undefined;
  option1: string;
  option2: string;
}) => {
  if (isLoggedIn === undefined) return null;

  if (isLoggedIn) {
    return <CreatePollButton option1={option1} option2={option2} />;
  }

  if (!isLoggedIn) {
    return <CreatePollUnauthorizedButton isLoggedIn={isLoggedIn} />;
  }

  return null;
};

export default CreatePollButtonContainer;
