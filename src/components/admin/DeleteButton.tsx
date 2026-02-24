import { useState } from "react";
import { Button } from "@headlessui/react";
import ConfirmModal from "@/components/ConfirmModal";

const DeleteButton = ({
  label,
  items,
  onDelete,
  isDeleting,
}: {
  label: string;
  items: { id: number; value: string }[];
  onDelete: (label: string) => void;
  isDeleting: boolean;
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    onDelete(label);
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        className="adminDashboard-deleteButton"
        data-row-interactive="true"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        title="Delete listing"
        aria-label="Delete listing"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="adminDashboard-deleteIcon"
        >
          <path
            fillRule="evenodd"
            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
            clipRule="evenodd"
          />
        </svg>
      </Button>

      <ConfirmModal
        open={showConfirm}
        title="Delete Listing"
        message={
          <>
            <p className="confirmModal-deleteWarning">
              Are you sure you want to delete "{label}"? This action cannot be
              undone.
            </p>
            <p className="confirmModal-deleteItemsTitle">
              Items in this listing ({items.length})
            </p>
            {items.length > 0 ? (
              <ul className="confirmModal-itemList">
                {items.map((item, index) => (
                  <li key={item.id} className="confirmModal-itemListRow">
                    <span className="confirmModal-itemListIndex">
                      {index + 1}.
                    </span>
                    <span className="confirmModal-itemListValue">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="confirmModal-itemListEmpty">No items</p>
            )}
          </>
        }
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default DeleteButton;
