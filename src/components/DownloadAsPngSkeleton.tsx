import styles from "../styles/Sort.module.css";

export const DownloadAsPngSkeleton = () => {
  return (
    <button className={`${styles.export} pulse`} style={{ opacity: "0.1" }}>
      Download as png
    </button>
  );
};

export default DownloadAsPngSkeleton;
