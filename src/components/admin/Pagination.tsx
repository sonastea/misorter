import { Button } from "@headlessui/react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  return (
    <div className="adminDashboard-pagination">
      <Button
        className="adminDashboard-paginationButton"
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
      >
        Previous
      </Button>
      <span className="adminDashboard-paginationInfo">
        Page {currentPage + 1} of {Math.max(1, totalPages)}
      </span>
      <Button
        className="adminDashboard-paginationButton"
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage >= totalPages - 1}
      >
        Next
      </Button>
    </div>
  );
};

export default Pagination;
