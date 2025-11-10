import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useState } from "react";

const ConfirmModal = ({
  title,
  message,
  onCancel,
  onConfirm,
  open,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(open);

  const handleCancel = () => {
    onCancel();
    setIsOpen(false);
  };

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
  };

  return (
    <Dialog
      className="confirmModal-dialog"
      open={isOpen}
      onClose={handleCancel}
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="confirmModal-backdrop" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="confirmModal-modal">
        <DialogPanel className="confirmModal-panel">
          <DialogTitle aria-label={title} className="confirmModal-title">
            {title}
          </DialogTitle>
          <Description
            aria-label={message}
            className="confirmModal-description"
          >
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
