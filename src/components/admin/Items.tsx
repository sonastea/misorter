import { useDelayedDisclosure } from "@/hooks/useDelayedDisclosure";

type Item = { id: number; value: string };

const Items = ({ items, count }: { items: Item[]; count: number }) => {
  const { open: showDropdown, handlers } = useDelayedDisclosure(200);

  if (items.length === 0) {
    return <span>{count}</span>;
  }

  return (
    <span
      className="adminDashboard-itemsTrigger"
      data-row-interactive="true"
      {...handlers}
    >
      <span className="adminDashboard-itemsCount">{count}</span>
      {showDropdown && (
        <div className="adminDashboard-itemsDropdown">
          <div className="adminDashboard-itemsDropdownContent">
            {items.slice(0, 20).map((item, i) => (
              <div key={item.id} className="adminDashboard-itemRow">
                <span className="adminDashboard-itemIndex">{i + 1}.</span>
                <span className="adminDashboard-itemValue">{item.value}</span>
              </div>
            ))}
            {items.length > 20 && (
              <div className="adminDashboard-itemsMore">
                +{items.length - 20} more
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
};

export default Items;
