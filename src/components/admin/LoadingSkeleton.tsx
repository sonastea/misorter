const SkeletonRow = () => (
  <tr className="adminDashboard-tableRow adminDashboard-tableRow--skeleton">
    <td className="adminDashboard-expandCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--icon" />
    </td>
    <td>
      <div className="adminDashboard-skeleton adminDashboard-skeleton--label" />
    </td>
    <td className="adminDashboard-titleCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--title" />
    </td>
    <td>
      <div className="adminDashboard-skeleton adminDashboard-skeleton--items" />
    </td>
    <td>
      <div className="adminDashboard-skeleton adminDashboard-skeleton--number" />
    </td>
    <td>
      <div className="adminDashboard-skeleton adminDashboard-skeleton--date" />
    </td>
    <td className="adminDashboard-actionsCell">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--action" />
    </td>
  </tr>
);

const MobileSkeletonCard = () => (
  <div className="adminDashboard-mobileCard adminDashboard-mobileCard--skeleton">
    <div className="adminDashboard-mobileCardHeader">
      <div className="adminDashboard-mobileCardTitleWrap">
        <div className="adminDashboard-skeleton adminDashboard-skeleton--icon" />
        <div className="adminDashboard-skeleton adminDashboard-skeleton--label" />
      </div>
      <div className="adminDashboard-skeleton adminDashboard-skeleton--action" />
    </div>
    <div className="adminDashboard-mobileCardBody">
      <div className="adminDashboard-skeleton adminDashboard-skeleton--mobileTitle" />
      <div className="adminDashboard-mobileCardMetaGrid">
        <div className="adminDashboard-mobileCardMetaItem">
          <div className="adminDashboard-skeleton adminDashboard-skeleton--metaLabel" />
          <div className="adminDashboard-skeleton adminDashboard-skeleton--metaValue" />
        </div>
        <div className="adminDashboard-mobileCardMetaItem">
          <div className="adminDashboard-skeleton adminDashboard-skeleton--metaLabel" />
          <div className="adminDashboard-skeleton adminDashboard-skeleton--metaValue" />
        </div>
        <div className="adminDashboard-mobileCardMetaItem">
          <div className="adminDashboard-skeleton adminDashboard-skeleton--metaLabel" />
          <div className="adminDashboard-skeleton adminDashboard-skeleton--metaValue" />
        </div>
      </div>
    </div>
  </div>
);

export const ListingSkeleton = () => {
  return (
    <>
      <div
        className="adminDashboard-tableScrollRegion"
        role="region"
        aria-label="Loading listings"
      >
        <div className="adminDashboard-tableWrapper">
          <table className="adminDashboard-table">
            <thead>
              <tr>
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

      <div className="adminDashboard-mobileCards" aria-label="Loading listings">
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
        <MobileSkeletonCard />
      </div>
    </>
  );
};

export default ListingSkeleton;
