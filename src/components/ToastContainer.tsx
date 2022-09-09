import { lazy } from "react";

lazy(async () => {
  const { ToastContainer } = await import("react-toastify");
  return { default: ToastContainer };
});

export { ToastContainer as default, toast } from "react-toastify";
