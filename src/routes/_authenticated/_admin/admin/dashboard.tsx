import { useState, useEffect, useMemo } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { getSupabaseBrowserClient } from "@/utils/supabase/browser";
import { ListingTable, Pagination, SignOutButton } from "@/components/admin";

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

    await navigate({ to: "/login", replace: true });
  };

  const handleDelete = (label: string) => {
    deleteMutation.mutate({ label });
  };

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0;

  return (
    <main className="adminDashboard-shell">
      <section className="adminDashboard-card">
        <div className="adminDashboard-header">
          <div>
            <h1 className="adminDashboard-title">Admin Dashboard</h1>
            <p className="adminDashboard-subtitle">
              Manage, search, & administer listings
            </p>
          </div>
          <SignOutButton
            isSigningOut={isSigningOut}
            onSignOut={handleSignOut}
          />
        </div>

        {errorMessage ? (
          <p role="alert" className="adminDashboard-error">
            {errorMessage}
          </p>
        ) : null}

        <div className="adminDashboard-searchRow">
          <input
            type="text"
            placeholder="Search by label or item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="adminDashboard-searchInput"
          />
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
      </section>
    </main>
  );
}
