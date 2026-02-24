import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { useRef, type MouseEvent } from "react";
import DeleteButton from "./DeleteButton";
import Items from "./Items";
import Label from "./Label";

type Listing = {
  label: string;
  title: string;
  itemCount: number;
  visitCount: number;
  createdAt: Date | string;
  items: { id: number; value: string }[];
};

const ROW_INTERACTIVE_SELECTOR = "[data-row-interactive='true']";

const ListingRow = ({
  listing,
  onDelete,
  isDeleting,
}: {
  listing: Listing;
  onDelete: (label: string) => void;
  isDeleting: boolean;
}) => {
  const disclosureButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(ROW_INTERACTIVE_SELECTOR)) {
      return;
    }

    disclosureButtonRef.current?.click();
  };

  return (
    <Disclosure as="tbody" className="adminDashboard-rowGroup">
      {({ open }) => (
        <>
          <tr className="adminDashboard-tableRow" onClick={handleRowClick}>
            <td className="adminDashboard-expandCell">
              <DisclosureButton
                ref={disclosureButtonRef}
                className="adminDashboard-expandButton"
                data-row-interactive="true"
                aria-label={
                  open ? "Collapse listing details" : "Expand listing details"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`adminDashboard-expandIcon ${open ? "adminDashboard-expandIcon--open" : ""}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </DisclosureButton>
            </td>
            <td>
              <Label label={listing.label} />
            </td>
            <td className="adminDashboard-titleCell">{listing.title}</td>
            <td>
              <Items items={listing.items} count={listing.itemCount} />
            </td>
            <td>{listing.visitCount}</td>
            <td>{new Date(listing.createdAt).toLocaleDateString()}</td>
            <td className="adminDashboard-actionsCell">
              <DeleteButton
                label={listing.label}
                items={listing.items}
                onDelete={onDelete}
                isDeleting={isDeleting}
              />
            </td>
          </tr>
          <tr>
            <td colSpan={7} className="adminDashboard-expandedCell">
              <DisclosurePanel className="adminDashboard-expandedPanel">
                <div className="adminDashboard-expandedContent">
                  <div className="adminDashboard-expandedSection">
                    {listing.items.length > 0 ? (
                      <div className="adminDashboard-expandedItems">
                        {listing.items.map((item, i) => (
                          <div
                            key={item.id}
                            className="adminDashboard-expandedItem"
                          >
                            <span className="adminDashboard-itemIndex">
                              {i + 1}.
                            </span>
                            <span className="adminDashboard-itemValue">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="adminDashboard-expandedEmpty">No items</p>
                    )}
                  </div>
                </div>
              </DisclosurePanel>
            </td>
          </tr>
        </>
      )}
    </Disclosure>
  );
};

const ListingTable = ({
  listings,
  onDelete,
  isDeleting,
}: {
  listings: Listing[];
  onDelete: (label: string) => void;
  isDeleting: boolean;
}) => {
  return (
    <div
      className="adminDashboard-tableScrollRegion"
      role="region"
      aria-label="Listings results"
    >
      <div className="adminDashboard-tableWrapper">
        <table className="adminDashboard-table">
          <thead>
            <tr>
              <th></th>
              <th>Label</th>
              <th>Title</th>
              <th>Items</th>
              <th>Visits</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          {listings.map((listing) => (
            <ListingRow
              key={listing.label}
              listing={listing}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          ))}
        </table>
      </div>
    </div>
  );
};

export default ListingTable;
