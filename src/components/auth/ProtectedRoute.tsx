import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { authMe } from "../../services/operations/auth";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  async function authenticateMe() {
    try {
      const response = await authMe();
      if (response === 200) {
        setIsAuth(true);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    authenticateMe();
  }, []);

  console.log(isAuth);

  if (loading) return <div>Loading...</div>;

  return isAuth ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
