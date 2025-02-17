const FeaturedListsToggle = ({
  toggleFeaturedLists,
}: {
  toggleFeaturedLists: () => void;
}) => {
  return (
    <button
      className="toggle featuredLists group"
      type="button"
      onClick={toggleFeaturedLists}
      title="View current featured lists"
    >
      <span className="toggleIcon group-hover:bg-once-hover">
        <span>🔥</span>
      </span>
    </button>
  );
};

export default FeaturedListsToggle;
