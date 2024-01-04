const FeaturedListsToggle = ({
  toggleFeaturedLists,
}: {
  toggleFeaturedLists: () => void;
}) => {
  return (
    <button
      className="toggle featuredLists"
      type="button"
      onClick={toggleFeaturedLists}
      title="View current featured lists"
    >
      <span className="toggleIcon">
        <span>🔥</span>
      </span>
    </button>
  );
};

export default FeaturedListsToggle;
