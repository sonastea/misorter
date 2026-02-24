import { useState, useEffect, useRef } from "react";

const Label = ({ label }: { label: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };

  const handleTouchStart = () => {
    setIsLongPress(false);
    timeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
      setShowTooltip(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isLongPress) {
      setShowTooltip(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(label);
    setShowTooltip(false);
  };

  return (
    <span
      ref={labelRef}
      className="adminDashboard-labelTrigger"
      data-row-interactive="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <span className="adminDashboard-labelText">{label}</span>
      {showTooltip && (
        <div className="adminDashboard-labelTooltip">
          <button
            type="button"
            className="adminDashboard-labelCopyButton"
            onClick={handleCopy}
          >
            Copy label
          </button>
        </div>
      )}
    </span>
  );
};

export default Label;
