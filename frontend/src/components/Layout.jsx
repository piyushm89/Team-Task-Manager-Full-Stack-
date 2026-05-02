import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // styling for the nav links
  function getLinkClass({ isActive }) {
    const base = 'px-3 py-1.5 rounded-md text-sm font-medium';
    if (isActive) {
      return base + ' bg-brand-50 text-brand-700';
    }
    return base + ' text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  }

  // logout and go to login page
  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* top header with nav */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="font-semibold text-slate-900">TaskBoard</div>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={getLinkClass}>Dashboard</NavLink>
            <NavLink to="/projects" className={getLinkClass}>Projects</NavLink>
            <NavLink to="/tasks" className={getLinkClass}>Tasks</NavLink>
            {isAdmin && <NavLink to="/people" className={getLinkClass}>People</NavLink>}
          </nav>

          {/* user info on the right */}
          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm text-slate-600">
              {user && user.name}
              <span className="ml-2 badge bg-slate-100 text-slate-700 capitalize">
                {user && user.role}
              </span>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* page content goes here */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        Team Task Manager
      </footer>
    </div>
  );
}
