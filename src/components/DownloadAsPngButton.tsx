import domtoimage from "dom-to-image-more";

export const DownloadAsPngButton = () => {
  const exportToPng = () => {
    domtoimage
      .toPng(document.getElementById("ResultsTable"))
      .then((dataUrl: string) => {
        const link = document.createElement("a");
        link.download = `misorter-results-${new Date().toLocaleString(
          "default",
          {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }
        )}.png`;
        link.href = dataUrl;
        link.click();
      });
  };

  return (
    <button
      className="sort-export"
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          exportToPng();
        }
      }}
    >
      Download as png
    </button>
  );
};

export default DownloadAsPngButton;
