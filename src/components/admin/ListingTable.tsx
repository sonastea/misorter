import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { useRef, type MouseEvent } from "react";
import DeleteButton from "./DeleteButton";
import Label from "./Label";
import Items from "./Items";

type Listing = {
  label: string;
  title: string;
  itemCount: number;
  visitCount: number;
  createdAt: Date | string;
  items: { id: number; value: string }[];
};

const ROW_INTERACTIVE_SELECTOR = "[data-row-interactive='true']";

const ListingExpandedContent = ({ listing }: { listing: Listing }) => {
  if (listing.items.length === 0) {
    return <p className="adminDashboard-expandedEmpty">No items</p>;
  }

  return (
    <div className="adminDashboard-expandedItems">
      {listing.items.map((item, i) => (
        <div key={item.id} className="adminDashboard-expandedItem">
          <span className="adminDashboard-itemIndex">{i + 1}.</span>
          <span className="adminDashboard-itemValue">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

const ListingRow = ({
  listing,
  onDelete,
  isDeleting,
  isSelected,
  onToggleSelection,
}: {
  listing: Listing;
  onDelete: (label: string) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onToggleSelection: (label: string) => void;
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
    <Disclosure as="tbody" role="rowgroup" className="adminDashboard-rowGroup">
      {({ open }) => (
        <>
          <tr
            role="row"
            className={
              isSelected
                ? "adminDashboard-tableRow adminDashboard-tableRow--selected"
                : "adminDashboard-tableRow"
            }
            onClick={handleRowClick}
          >
            <td role="cell" className="adminDashboard-selectCell">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(listing.label)}
                className="adminDashboard-checkbox"
                data-row-interactive="true"
                aria-label={`Select ${listing.label}`}
              />
            </td>
            <td role="cell" className="adminDashboard-expandCell">
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
            <td role="cell" className="adminDashboard-labelCell">
              <Label label={listing.label} />
            </td>
            <td role="cell" className="adminDashboard-titleCell">
              {listing.title}
            </td>
            <td role="cell" className="adminDashboard-itemsCell">
              <span className="adminDashboard-cellCaption" aria-hidden="true">
                Items
              </span>
              <Items items={listing.items} count={listing.itemCount} />
            </td>
            <td role="cell" className="adminDashboard-visitsCell">
              <span className="adminDashboard-cellCaption" aria-hidden="true">
                Visits
              </span>
              {listing.visitCount}
            </td>
            <td role="cell" className="adminDashboard-createdCell">
              <span className="adminDashboard-cellCaption" aria-hidden="true">
                Created
              </span>
              {new Date(listing.createdAt).toLocaleDateString()}
            </td>
            <td role="cell" className="adminDashboard-actionsCell">
              <DeleteButton
                label={listing.label}
                items={listing.items}
                onDelete={onDelete}
                isDeleting={isDeleting}
              />
            </td>
          </tr>
          <tr role="row" className="adminDashboard-detailsRow" hidden={!open}>
            <td role="cell" colSpan={8} className="adminDashboard-expandedCell">
              <DisclosurePanel className="adminDashboard-expandedPanel">
                <div className="adminDashboard-expandedContent">
                  <div className="adminDashboard-expandedSection">
                    <ListingExpandedContent listing={listing} />
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
  selectedLabels,
  onToggleSelection,
  onToggleSelectAll,
}: {
  listings: Listing[];
  onDelete: (label: string) => void;
  isDeleting: boolean;
  selectedLabels: Set<string>;
  onToggleSelection: (label: string) => void;
  onToggleSelectAll: () => void;
}) => {
  const allSelected =
    listings.length > 0 && selectedLabels.size === listings.length;
  const someSelected =
    selectedLabels.size > 0 && selectedLabels.size < listings.length;

  return (
    <div
      className="adminDashboard-tableScrollRegion"
      role="region"
      aria-label="Listings results"
    >
      <div className="adminDashboard-tableWrapper">
        <table
          role="table"
          aria-label="Listings"
          className="adminDashboard-table adminDashboard-responsiveTable"
        >
          <thead role="rowgroup">
            <tr role="row">
              <th
                role="columnheader"
                scope="col"
                className="adminDashboard-selectHeader"
              >
                <label className="adminDashboard-selectAllLabel">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={onToggleSelectAll}
                    className="adminDashboard-checkbox"
                    aria-label="Select all listings"
                  />
                  <span
                    className="adminDashboard-cellCaption"
                    aria-hidden="true"
                  >
                    Select all
                  </span>
                </label>
              </th>
              <th
                role="columnheader"
                scope="col"
                aria-label="Expand details"
              ></th>
              <th role="columnheader" scope="col">
                Label
              </th>
              <th role="columnheader" scope="col">
                Title
              </th>
              <th role="columnheader" scope="col">
                Items
              </th>
              <th role="columnheader" scope="col">
                Visits
              </th>
              <th role="columnheader" scope="col">
                Created
              </th>
              <th role="columnheader" scope="col" aria-label="Actions"></th>
            </tr>
          </thead>
          {listings.map((listing) => (
            <ListingRow
              key={listing.label}
              listing={listing}
              onDelete={onDelete}
              isDeleting={isDeleting}
              isSelected={selectedLabels.has(listing.label)}
              onToggleSelection={onToggleSelection}
            />
          ))}
        </table>
      </div>
    </div>
  );
};

export default ListingTable;
