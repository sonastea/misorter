import { Button } from "@headlessui/react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export const DownloadAsPngButton = () => {
  const exportToPng = async () => {
    const node = document.getElementById("ResultsContainer");
    if (!node) {
      toast.error("Nothing to export yet.");
      return;
    }
    try {
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `misorter-results-${new Date().toLocaleString("default", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      toast.error("Unable to export PNG.");
    }
  };

  return (
    <Button
      className="sort-export"
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          void exportToPng();
        }
      }}
    >
      Download as png
    </Button>
  );
};

export default DownloadAsPngButton;
