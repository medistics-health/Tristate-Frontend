import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { authMe } from "../../services/operations/auth";
import { Spinner } from "../layout/Spinner";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  async function authenticateMe() {
    try {
      const response: any = await authMe();

      if (response.id) {
        setIsAuth(true);
        localStorage.setItem("user", response.name);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    authenticateMe();
  }, []);

  if (loading)
    return (
      <div>
        <Spinner />
      </div>
    );

  return isAuth ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
