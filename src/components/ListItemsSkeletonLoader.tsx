import styles from "../styles/Home.module.css";
import ListItemSkeleton from "./ListItemSkeleton";

const ListOfItems = new Array(9).fill(null);

const ListItemsSkeletonLoader = () => {
  return (
    <>
      <div className={styles.inputContainer}>
        <input
          className={`${styles.listInput} pulse`}
          type="text"
          placeholder="Add an item to the list"
          name="newItem"
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
        {ListOfItems.map((_, index) => {
          return <ListItemSkeleton key={index} />;
        })}
      </ul>
    </>
  );
};

export default ListItemsSkeletonLoader;
