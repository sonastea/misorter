const ListTitle = ({
  title,
  setEditTitle,
}: {
  title: string;
  setEditTitle: (value: boolean) => void;
}) => {
  return (
    <div className="home-titleContainer">
      <span
        className="home-title"
        onDoubleClick={() => setEditTitle(true)}
        title={title}
      >
        {title}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="home-editTitleButton"
        onClick={() => setEditTitle(true)}
      >
        <path
          fill="currentColor"
          d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"
        />
      </svg>
    </div>
  );
};

export default ListTitle;
