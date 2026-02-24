import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type KeyboardEvent,
} from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { getSupabaseBrowserClient } from "@/utils/supabase/browser";
import {
  ActivityPanel,
  AdminShell,
  AdminThemeToggle,
  ListingSkeleton,
  ListingTable,
  Pagination,
  SignOutButton,
} from "@/components/admin";
import ConfirmModal from "@/components/ConfirmModal";

function redirectToLogin(redirectPath: string): never {
  throw redirect({
    to: "/login",
    search: {
      redirect: redirectPath,
    },
  });
}

type QuickFilter = "all" | "has-items" | "empty" | "visited";

type DashboardSearch = {
  filter?: QuickFilter;
};

const QUICK_FILTER_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "has-items", label: "Has Items" },
  { value: "empty", label: "Empty" },
  { value: "visited", label: "Visited" },
];

function normalizeQuickFilter(value: unknown): QuickFilter | undefined {
  if (
    value === "all" ||
    value === "has-items" ||
    value === "empty" ||
    value === "visited"
  ) {
    return value;
  }

  return undefined;
}

export const Route = createFileRoute("/_authenticated/_admin/admin/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    filter: normalizeQuickFilter(search.filter),
  }),
  ssr: true,
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient
      .fetchQuery(trpc.auth.getCurrentUser.queryOptions())
      .catch((err) => console.error("Admin dashboard getCurrentUser: ", err));

    if (!user) {
      redirectToLogin(location.pathname);
    }

    return { user };
  },
  loader: ({ context: { user } }) => {
    return user;
  },
  component: RouteComponent,
});

const PAGE_SIZE = 50;
const numberFormatter = new Intl.NumberFormat();

function RouteComponent() {
  const { filter } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const clearSelection = () => setSelectedLabels(new Set());

  const toggleSelection = (label: string) => {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLabels.size === filteredListings.length) {
      clearSelection();
    } else {
      setSelectedLabels(new Set(filteredListings.map((l) => l.label)));
    }
  };

  const { data, isLoading, isFetching } = useQuery({
    ...trpc.listing.getAllPaginated.queryOptions({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      query: debouncedSearchTerm || undefined,
    }),
    placeholderData: (previousData) => previousData,
  });

  const activeQuickFilter = filter ?? "all";

  const searchMatchedListings = useMemo(() => {
    const listings = data?.listings;
    if (!listings) return [];
    if (!searchTerm) return listings;
    const lowerSearch = searchTerm.toLowerCase();
    return listings.filter(
      (listing) =>
        listing.label.toLowerCase().includes(lowerSearch) ||
        listing.items.some((item) =>
          item.value.toLowerCase().includes(lowerSearch)
        )
    );
  }, [data?.listings, searchTerm]);

  const quickFilterCounts = useMemo(() => {
    const listings = searchMatchedListings;
    return {
      all: listings.length,
      "has-items": listings.reduce(
        (sum, listing) => sum + (listing.itemCount > 0 ? 1 : 0),
        0
      ),
      empty: listings.reduce(
        (sum, listing) => sum + (listing.itemCount === 0 ? 1 : 0),
        0
      ),
      visited: listings.reduce(
        (sum, listing) => sum + (listing.visitCount > 0 ? 1 : 0),
        0
      ),
    };
  }, [searchMatchedListings]);

  const getFilteredListings = () => {
    switch (activeQuickFilter) {
      case "has-items":
        return searchMatchedListings.filter((listing) => listing.itemCount > 0);
      case "empty":
        return searchMatchedListings.filter(
          (listing) => listing.itemCount === 0
        );
      case "visited":
        return searchMatchedListings.filter(
          (listing) => listing.visitCount > 0
        );
      default:
        return searchMatchedListings;
    }
  };

  const filteredListings = getFilteredListings();

  const handleQuickFilterChange = useCallback(
    (nextFilter: QuickFilter) => {
      setPage(0);
      clearSelection();
      navigate({
        to: ".",
        search: (previous) => ({
          ...previous,
          filter: nextFilter === "all" ? undefined : nextFilter,
        }),
        replace: true,
      });
    },
    [navigate]
  );

  const deleteMutation = useMutation(
    trpc.listing.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.listing.getAllPaginated.queryKey(),
        });
      },
      onError: (error) => {
        setErrorMessage(error.message);
      },
    })
  );

  const bulkDeleteMutation = useMutation(
    trpc.listing.deleteMany.mutationOptions({
      onSuccess: (data) => {
        clearSelection();
        queryClient.invalidateQueries({
          queryKey: trpc.listing.getAllPaginated.queryKey(),
        });
        if (data.notFoundCount > 0) {
          setErrorMessage(
            `Deleted ${data.deletedCount} listings. ${data.notFoundCount} listing${data.notFoundCount === 1 ? "" : "s"} were not found (may have been already deleted).`
          );
        }
      },
      onError: (error) => {
        setErrorMessage(error.message);
      },
    })
  );

  const handleBulkDelete = () => {
    if (selectedLabels.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate({ labels: Array.from(selectedLabels) });
    setShowBulkDeleteConfirm(false);
  };

  const handleExportCSV = () => {
    if (filteredListings.length === 0) return;

    const headers = [
      "Label",
      "Title",
      "Item Count",
      "Visit Count",
      "Created At",
      "Items",
    ];
    const rows = filteredListings.map((listing) => [
      listing.label,
      listing.title || "",
      listing.itemCount.toString(),
      listing.visitCount.toString(),
      new Date(listing.createdAt).toISOString(),
      listing.items.map((item) => item.value).join(" | "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const escaped = cell.replace(/"/g, '""');
            return cell.includes(",") ||
              cell.includes('"') ||
              cell.includes("\n")
              ? `"${escaped}"`
              : escaped;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filterSuffix =
      activeQuickFilter !== "all" ? `-${activeQuickFilter}` : "";
    const searchSuffix = searchTerm ? "-filtered" : "";

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `listings-${timestamp}${filterSuffix}${searchSuffix}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsSigningOut(true);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      setIsSigningOut(false);
      return;
    }

    queryClient.invalidateQueries({
      queryKey: trpc.auth.getCurrentUser.queryKey(),
    });

    await navigate({ to: "/login", replace: true });
  };

  const handleDelete = (label: string) => {
    deleteMutation.mutate({ label });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setPage(0);
    clearSelection();
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && searchTerm) {
      event.preventDefault();
      handleClearSearch();
    }
  };

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0;
  const kpiMetrics = useMemo(() => {
    const listings = filteredListings;
    const listingsOnPage = listings.length;
    const totalItems = listings.reduce(
      (sum, listing) => sum + listing.itemCount,
      0
    );
    const totalVisits = listings.reduce(
      (sum, listing) => sum + listing.visitCount,
      0
    );
    const zeroItemListings = listings.reduce(
      (sum, listing) => sum + (listing.itemCount === 0 ? 1 : 0),
      0
    );

    return {
      totalListings: data?.totalCount ?? 0,
      listingsOnPage,
      totalItems,
      totalVisits,
      zeroItemListings,
    };
  }, [data?.totalCount, filteredListings]);

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Manage, search, & administer listings"
      actions={
        <>
          <AdminThemeToggle />
          <SignOutButton
            isSigningOut={isSigningOut}
            onSignOut={handleSignOut}
          />
        </>
      }
    >
      {errorMessage ? (
        <div className="adminDashboard-errorBanner" role="alert">
          <div className="adminDashboard-errorBannerIcon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="adminDashboard-errorBannerContent">
            <p className="adminDashboard-errorBannerTitle">
              Something went wrong
            </p>
            <p className="adminDashboard-errorBannerMessage">{errorMessage}</p>
          </div>
          <button
            type="button"
            className="adminDashboard-errorBannerDismiss"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="adminDashboard-searchRow">
        <div className="adminDashboard-searchInputWrap">
          <svg
            className="adminDashboard-searchIcon"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14 14L18 18M15.333 9.667a5.667 5.667 0 1 1-11.334 0 5.667 5.667 0 0 1 11.334 0Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by label or item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="adminDashboard-searchInput"
          />
          {searchTerm ? (
            <button
              type="button"
              className="adminDashboard-searchClear"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
        {(searchTerm || activeQuickFilter !== "all") && (
          <span className="adminDashboard-searchMeta">
            Showing {filteredListings.length} of {data?.totalCount ?? 0}
          </span>
        )}
        {isFetching && !isLoading && (
          <span className="adminDashboard-searchUpdating" aria-live="polite">
            Updating...
          </span>
        )}
      </div>

      <section
        className="adminDashboard-filterChips"
        aria-label="Quick filters"
      >
        {QUICK_FILTER_OPTIONS.map((option) => {
          const count = quickFilterCounts[option.value];
          const isActive = activeQuickFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={
                isActive
                  ? "adminDashboard-filterChip adminDashboard-filterChip--active"
                  : "adminDashboard-filterChip"
              }
              onClick={() => handleQuickFilterChange(option.value)}
              aria-pressed={isActive}
            >
              <span>{option.label}</span>
              <span className="adminDashboard-filterChipCount">
                {numberFormatter.format(count)}
              </span>
            </button>
          );
        })}
      </section>

      <section
        className="adminDashboard-kpiStrip"
        aria-label="Inventory metrics"
      >
        <article className="adminDashboard-kpiCard">
          <p className="adminDashboard-kpiLabel">Total Listings</p>
          <p className="adminDashboard-kpiValue">
            {numberFormatter.format(kpiMetrics.totalListings)}
          </p>
          <p className="adminDashboard-kpiMeta">From current search query</p>
        </article>

        <article className="adminDashboard-kpiCard">
          <p className="adminDashboard-kpiLabel">Items on Page</p>
          <p className="adminDashboard-kpiValue">
            {numberFormatter.format(kpiMetrics.totalItems)}
          </p>
          <p className="adminDashboard-kpiMeta">
            Across {numberFormatter.format(kpiMetrics.listingsOnPage)} listings
          </p>
        </article>

        <article className="adminDashboard-kpiCard">
          <p className="adminDashboard-kpiLabel">Visits on Page</p>
          <p className="adminDashboard-kpiValue">
            {numberFormatter.format(kpiMetrics.totalVisits)}
          </p>
          <p className="adminDashboard-kpiMeta">Total listing visits in view</p>
        </article>

        <article className="adminDashboard-kpiCard">
          <p className="adminDashboard-kpiLabel">Empty Listings</p>
          <p className="adminDashboard-kpiValue">
            {numberFormatter.format(kpiMetrics.zeroItemListings)}
          </p>
          <p className="adminDashboard-kpiMeta">Listings with zero items</p>
        </article>
      </section>

      {selectedLabels.size > 0 && (
        <section
          className="adminDashboard-bulkActions"
          aria-label="Bulk actions"
        >
          <div className="adminDashboard-bulkActionsInfo">
            <span className="adminDashboard-bulkActionsCount">
              {numberFormatter.format(selectedLabels.size)}
            </span>
            <span className="adminDashboard-bulkActionsLabel">
              {selectedLabels.size === 1
                ? "listing selected"
                : "listings selected"}
            </span>
          </div>
          <div className="adminDashboard-bulkActionsButtons">
            <button
              type="button"
              className="adminDashboard-bulkActionBtn adminDashboard-bulkActionBtn--secondary"
              onClick={handleExportCSV}
              disabled={
                bulkDeleteMutation.isPending || filteredListings.length === 0
              }
              title="Export filtered results to CSV"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="adminDashboard-bulkActionIcon"
              >
                <path
                  d="M10 12v-8m0 0l-3 3m3-3l3 3M4 14h12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export CSV
            </button>
            <button
              type="button"
              className="adminDashboard-bulkActionBtn adminDashboard-bulkActionBtn--secondary"
              onClick={clearSelection}
              disabled={bulkDeleteMutation.isPending}
            >
              Clear
            </button>
            <button
              type="button"
              className="adminDashboard-bulkActionBtn adminDashboard-bulkActionBtn--danger"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting..."
                : `Delete ${selectedLabels.size}`}
            </button>
          </div>
        </section>
      )}

      <div className="adminDashboard-listingsSection">
        {isLoading && !data ? (
          <ListingSkeleton />
        ) : filteredListings.length === 0 ? (
          searchTerm ? (
            <div className="adminDashboard-state">
              <div className="adminDashboard-stateIcon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="adminDashboard-stateTitle">No results found</p>
              <p className="adminDashboard-stateDescription">
                No listings match <strong>{searchTerm}</strong>
              </p>
              <button
                type="button"
                className="adminDashboard-stateAction"
                onClick={handleClearSearch}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="adminDashboard-state">
              <div className="adminDashboard-stateIcon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="adminDashboard-stateTitle">No listings yet</p>
              <p className="adminDashboard-stateDescription">
                Your inventory is empty. Create a new listing to get started.
              </p>
            </div>
          )
        ) : (
          <>
            <ListingTable
              listings={filteredListings}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
              selectedLabels={selectedLabels}
              onToggleSelection={toggleSelection}
              onToggleSelectAll={toggleSelectAll}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ActivityPanel />

      <ConfirmModal
        open={showBulkDeleteConfirm}
        title="Delete Listings"
        message={
          <>
            <p className="confirmModal-deleteWarning">
              Are you sure you want to delete {selectedLabels.size} listing
              {selectedLabels.size === 1 ? "" : "s"}? This action cannot be
              undone.
            </p>
          </>
        }
        onCancel={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
      />
    </AdminShell>
  );
}
