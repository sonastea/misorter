import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import SupportForm from "src/components/SupportForm";
import ThemeToggle from "src/components/ThemeToggle";
import ToastContainer from "src/components/ToastContainer";
import NoticeBanner from "src/components/NoticeBanner";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <NoticeBanner />
      <ThemeToggle />
      <SupportForm />
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={true}
        closeOnClick
        theme="dark"
        draggable
        toastClassName="toastBody"
      />
      <Outlet />
    </>
  );
}
