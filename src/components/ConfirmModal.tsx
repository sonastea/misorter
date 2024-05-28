import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useState } from "react";
import styles from "../styles/ConfirmModal.module.css";

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
    <Dialog className={styles.dialog} open={isOpen} onClose={handleCancel}>
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className={styles.backdrop} aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className={styles.modal}>
        <DialogPanel className={styles.panel}>
          <DialogTitle aria-label={title} className={styles.title}>
            {title}
          </DialogTitle>
          <Description aria-label={message} className={styles.description}>
            {message}
          </Description>

          <div className={styles.buttonContainer}>
            <button
              aria-label="Cancel Button"
              className={styles.cancel}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              aria-label="Confirm Button"
              className={styles.confirm}
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
