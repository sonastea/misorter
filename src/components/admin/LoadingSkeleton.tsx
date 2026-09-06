const SkeletonRow = () => (
  <tr className="adminDashboard-tableRow adminDashboard-tableRow--skeleton">
    <td className="adminDashboard-selectCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--icon" />
    </td>
    <td className="adminDashboard-expandCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--icon" />
    </td>
    <td className="adminDashboard-labelCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--label" />
    </td>
    <td className="adminDashboard-titleCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--title" />
    </td>
    <td className="adminDashboard-itemsCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--items" />
    </td>
    <td className="adminDashboard-visitsCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--number" />
    </td>
    <td className="adminDashboard-createdCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--date" />
    </td>
    <td className="adminDashboard-actionsCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--action" />
    </td>
  </tr>
);

export const ListingSkeleton = () => {
  return (
    <div
      className="adminDashboard-tableScrollRegion"
      role="region"
      aria-label="Loading listings"
    >
      <div className="adminDashboard-tableWrapper">
        <table
          aria-hidden="true"
          className="adminDashboard-table adminDashboard-responsiveTable"
        >
          <thead>
            <tr>
              <th className="adminDashboard-selectHeader"></th>
              <th></th>
              <th>Label</th>
              <th>Title</th>
              <th>Items</th>
              <th>Visits</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="adminDashboard-skeletonBody">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListingSkeleton;
