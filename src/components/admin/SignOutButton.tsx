import { Button } from "@headlessui/react";

const SignOutButton = ({
  isSigningOut,
  onSignOut,
}: {
  isSigningOut: boolean;
  onSignOut: () => void;
}) => {
  return (
    <Button
      type="button"
      className="adminDashboard-signOut"
      disabled={isSigningOut}
      onClick={onSignOut}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </Button>
  );
};

export default SignOutButton;
