import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { hasAnyRole, readStoredUser, type UserRole } from "../../utils/auth";

type RoleRouteProps = {
  children: JSX.Element;
  allowedRoles: readonly UserRole[];
};

function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const user = readStoredUser();

  if (!hasAnyRole(user?.role as string | undefined, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RoleRoute;
