import { useDelayedDisclosure } from "@/hooks/useDelayedDisclosure";

const Label = ({ label }: { label: string }) => {
  const { open: showTooltip, close, handlers } = useDelayedDisclosure(300);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(label);
    close();
  };

  return (
    <span
      className="adminDashboard-labelTrigger"
      data-row-interactive="true"
      {...handlers}
    >
      <span className="adminDashboard-labelText">{label}</span>
      {showTooltip && (
        <div className="adminDashboard-labelTooltip">
          <button
            type="button"
            className="adminDashboard-labelCopyButton"
            onClick={handleCopy}
          >
            Copy label
          </button>
        </div>
      )}
    </span>
  );
};

export default Label;
