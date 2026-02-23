import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { type ReactNode } from "react";

const ConfirmModal = ({
  title,
  message,
  onCancel,
  onConfirm,
  open,
}: {
  title: string;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) => {
  const handleCancel = () => {
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog className="confirmModal-dialog" open={open} onClose={handleCancel}>
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="confirmModal-backdrop" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="confirmModal-modal">
        <DialogPanel className="confirmModal-panel">
          <DialogTitle aria-label={title} className="confirmModal-title">
            {title}
          </DialogTitle>
          <Description as="div" className="confirmModal-description">
            {message}
          </Description>

          <div className="confirmModal-buttonContainer">
            <button
              aria-label="Cancel Button"
              className="confirmModal-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              aria-label="Confirm Button"
              className="confirmModal-confirm"
              onClick={handleConfirm}
            >
              Yes
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default ConfirmModal;
