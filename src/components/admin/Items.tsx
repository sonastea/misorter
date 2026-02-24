import { useState, useRef, useEffect } from "react";

type Item = { id: number; value: string };

const Items = ({ items, count }: { items: Item[]; count: number }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (items.length === 0) {
    return <span>{count}</span>;
  }

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowDropdown(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowDropdown(false);
  };

  const handleTouchStart = () => {
    setIsLongPress(false);
    timeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
      setShowDropdown(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isLongPress) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLongPress]);

  return (
    <span
      className="adminDashboard-itemsTrigger"
      data-row-interactive="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
