import styles from "../styles/Home.module.css";

const ListItemsSkeletonLoader = () => {
  return (
    <>
      <div className={styles.inputContainer}>
        <input
          className={`${styles.listInput} pulse`}
          type="text"
          placeholder="Add an item to the list"
        />
        <button
          aria-label="Add item to the list"
          className={`${styles.inputButton} pulse`}
          style={{ opacity: "0.1" }}
          type="button"
        >
          <svg className={styles.inputButtonIcon} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
            />
          </svg>
        </button>
      </div>
      <ul className={`${styles.listTable} pulse`}>
        <li className={styles.item}>
          <p>&#8205;</p>
          <svg
            className={styles.removeItem}
            style={{ width: "1.75em", height: "1.75em", opacity: "0.1" }}
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
            />
          </svg>
        </li>
        <li className={styles.item}>
          <p>&#8205;</p>
          <svg
            className={styles.removeItem}
            style={{ width: "1.75em", height: "1.75em", opacity: "0.1" }}
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
            />
          </svg>
        </li>
        <li className={styles.item}>
          <p>&#8205;</p>
          <svg
            className={styles.removeItem}
            style={{ width: "1.75em", height: "1.75em", opacity: "0.1" }}
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
            />
          </svg>
        </li>
      </ul>
    </>
  );
};

export default ListItemsSkeletonLoader;
