import html2canvas from "html2canvas";
import styles from "../styles/Sort.module.css";

export const DownloadAsPngButton = () => {
  const exportToPng = () => {
    html2canvas(document.getElementById("ResultsTable") as HTMLElement).then(
      (canvas) => {
        let link = document.createElement("a");
        link.download = `misorter-results-${new Date(
          Date.now()
        ).toLocaleString()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    );
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
