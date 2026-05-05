import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasAnyPermission, hasPermission } from '../utils/permissions';
import {
  Building2,
  FilePlus2,
  FolderKanban,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  if (!user) return null;

  const isActive = (path) =>
    path === '/dashboard' ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim().toLowerCase();
    if (!query) return;

    if (query.includes('user') && canManageTeam) {
      navigate('/admin/users');
    } else if ((query.includes('role') || query.includes('permission')) && canManageRoles) {
      navigate('/admin/roles');
    } else if ((query.includes('org') || query.includes('tenant')) && canManageOrganizations) {
      navigate('/platform/organizations');
    } else if ((query.includes('case') || query.includes('complaint') || query.includes('operation')) && canAccessOperations) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const avatarSeed = user.full_name || user.email || 'U';
  const canAccessOperations = hasAnyPermission(user, [
    'complaints:update',
    'complaints:assign',
    'users:manage',
    'roles:manage',
  ]);
  const canManageOrganizations = hasPermission(user, 'organizations:manage');
  const canManageTeam = hasPermission(user, 'users:manage');
  const canManageRoles = hasPermission(user, 'roles:manage');

  const primaryLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/admin', label: 'Operations', icon: FolderKanban, show: canAccessOperations },
    { to: '/platform/organizations', label: 'Organizations', icon: Building2, show: canManageOrganizations },
    { to: '/admin/users', label: 'Users', icon: Users, show: canManageTeam },
    { to: '/admin/roles', label: 'Roles', icon: Layers3, show: canManageRoles },
  ].filter((item) => item.show);

  const secondaryLinks = [
    { to: '/settings', label: 'Settings', icon: Settings, show: true },
  ].filter((item) => item.show);

  const routeMeta = [
    { match: '/admin/users', title: 'User Management', description: 'Create users, assign roles, and control access.' },
    { match: '/admin/roles', title: 'Role Management', description: 'Design permission packs for organization teams.' },
    { match: '/platform/organizations', title: 'Organizations', description: 'Provision tenants and workspace admins.' },
    { match: '/admin', title: 'Operations', description: 'Track incidents, assignment, and resolution flow.' },
    { match: '/complaints/new', title: 'New Report', description: 'Submit a complaint into the workspace.' },
    { match: '/settings', title: 'Settings', description: 'Manage your profile and workspace preferences.' },
    { match: '/dashboard', title: 'Dashboard', description: 'Overview of workload, performance, and recent activity.' },
  ];
  const currentMeta =
    routeMeta.find((item) =>
      item.match === '/dashboard' ? location.pathname === item.match : location.pathname.startsWith(item.match)
    ) || routeMeta[routeMeta.length - 1];

  const SidebarContent = ({ onNavigate }) => (
    <>
      <div className="flex h-16 items-center gap-3 px-5">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            {user.organization_logo_url ? (
              <img src={user.organization_logo_url} alt="Organization Logo" className="h-full w-full object-cover" />
            ) : (
              <Shield className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-base font-black leading-5 text-slate-950">SmartMS</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {canManageOrganizations ? 'Platform' : 'Workspace'}
            </p>
          </div>
        </Link>
      </div>

      <div className="mt-4 px-3">
        <p className="px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Main</p>
        <nav className="mt-3 space-y-1">
          {primaryLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`side-link ${isActive(item.to) ? 'side-link-active' : 'side-link-inactive'}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 px-3">
        <p className="px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Tools</p>
        <nav className="mt-3 space-y-1">
          {user.organization_id && (
            <Link
              to="/complaints/new"
              onClick={onNavigate}
              className={`side-link ${isActive('/complaints/new') ? 'side-link-active' : 'side-link-inactive'}`}
            >
              <FilePlus2 className="h-4 w-4" />
              New Report
            </Link>
          )}
          {secondaryLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`side-link ${isActive(item.to) ? 'side-link-active' : 'side-link-inactive'}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="truncate text-xs font-black text-slate-900">{user.organization_name || 'Global Control'}</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent />
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl lg:left-64">
        <div className="flex h-[72px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
              title="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 lg:block">
              <div className="flex items-center gap-2">
                <p className="truncate text-lg font-black text-slate-950">{currentMeta.title}</p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  Live
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{currentMeta.description}</p>
            </div>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <form onSubmit={handleSearch} className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search users, roles, organizations, cases"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
            </form>
          </div>

          <div className="flex items-center gap-3">
            {user.organization_id && (
              <Link to="/complaints/new" className="hidden items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 md:flex">
                <FilePlus2 className="h-4 w-4" />
                New Report
              </Link>
            )}
            <Link
              to="/settings"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2.5 py-2 transition hover:border-indigo-200 hover:shadow-sm"
              title="Profile settings"
            >
              <div className="h-8 w-8 overflow-hidden rounded-lg bg-slate-900 text-center text-sm font-black leading-8 text-white">
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="Me" className="h-full w-full object-cover" />
                ) : (
                  avatarSeed[0].toUpperCase()
                )}
              </div>
              <div className="hidden text-left xl:block">
                <p className="max-w-36 truncate text-xs font-black text-slate-900">{user.full_name || user.email}</p>
                <p className="max-w-36 truncate text-[11px] font-medium text-slate-500">{user.organization_name || 'Global Control'}</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/40"
          />
          <aside className="relative flex h-full w-72 flex-col border-r border-slate-200 bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              title="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
};

export default Navbar;
