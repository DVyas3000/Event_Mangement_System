import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Debugging logs
  console.log("Current User Role:", user?.role); 
  console.log("Allowed Roles for this Route:", allowedRoles);

  if (!user) {
    console.log("No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Requirement 4.2: Role-based access control
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log("Role mismatch! User role does not match allowed roles.");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;