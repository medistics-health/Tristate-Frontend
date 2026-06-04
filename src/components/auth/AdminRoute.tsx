import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { hasAdminAccess, readStoredUser } from "../../utils/auth";

function AdminRoute({ children }: { children: JSX.Element }) {
  const user = readStoredUser();

  if (!hasAdminAccess(user?.role as string | undefined)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;
