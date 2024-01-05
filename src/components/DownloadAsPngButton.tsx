import domtoimage from "dom-to-image-more";
import styles from "../styles/Sort.module.css";

export const DownloadAsPngButton = () => {
  const exportToPng = () => {
    domtoimage
      .toPng(document.getElementById("ResultsTable"))
      .then((dataUrl: string) => {
        let link = document.createElement("a");
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
      className={styles.export}
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
