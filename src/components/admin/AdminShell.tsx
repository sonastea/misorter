import { ReactNode } from "react";

type AdminShellProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
};

const AdminShell = ({
  title,
  subtitle,
  actions,
  children,
}: AdminShellProps) => {
  return (
    <main className="adminDashboard-shell">
      <section className="adminDashboard-card">
        <header className="adminDashboard-header">
          <div className="adminDashboard-headerCopy">
            <h1 className="adminDashboard-title">{title}</h1>
            <p className="adminDashboard-subtitle">{subtitle}</p>
          </div>
          {actions ? (
            <div className="adminDashboard-headerActions">{actions}</div>
          ) : null}
        </header>

        {children}
      </section>
    </main>
  );
};

export default AdminShell;
