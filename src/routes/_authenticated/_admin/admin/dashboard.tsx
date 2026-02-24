import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { getSupabaseBrowserClient } from "@/utils/supabase/browser";
import {
  AdminShell,
  AdminThemeToggle,
  ListingTable,
  Pagination,
  SignOutButton,
} from "@/components/admin";

function redirectToLogin(redirectPath: string): never {
  throw redirect({
    to: "/login",
    search: {
      redirect: redirectPath,
    },
  });
}

export const Route = createFileRoute("/_authenticated/_admin/admin/dashboard")({
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

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isFetching } = useQuery({
    ...trpc.listing.getAllPaginated.queryOptions({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      query: debouncedSearchTerm || undefined,
    }),
    placeholderData: (previousData) => previousData,
  });

  const filteredListings = useMemo(() => {
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
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && searchTerm) {
      event.preventDefault();
      handleClearSearch();
    }
  };

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0;

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
        <p role="alert" className="adminDashboard-error">
          {errorMessage}
        </p>
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
        {searchTerm && (
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

      <div className="adminDashboard-listingsSection">
        {isLoading && !data ? (
          <p className="adminDashboard-loading">Loading listings...</p>
        ) : filteredListings.length === 0 ? (
          <p className="adminDashboard-noListings">No listings found.</p>
        ) : (
          <>
            <ListingTable
              listings={filteredListings}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </AdminShell>
  );
}
