import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

// format a date nicely
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

// check if a task is overdue
function isOverdue(t) {
  if (!t.dueDate) return false;
  if (t.status === 'done') return false;
  return new Date(t.dueDate) < new Date();
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch tasks and projects when component loads
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        // admins see everything, members only see their own tasks
        const params = isAdmin ? {} : { mine: true };

        const tasksResponse = await api.get('/api/tasks', { params: params });
        const projectsResponse = await api.get('/api/projects');

        if (!cancelled) {
          setTasks(tasksResponse.data.tasks || []);
          setProjects(projectsResponse.data.projects || []);
        }
      } catch (err) {
        console.log('dashboard load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => { cancelled = true; };
  }, [isAdmin]);

  // count tasks by status
  let todoCount = 0;
  let inProgressCount = 0;
  let doneCount = 0;
  let overdueCount = 0;

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (t.status === 'todo') todoCount++;
    else if (t.status === 'in_progress') inProgressCount++;
    else if (t.status === 'done') doneCount++;

    if (isOverdue(t)) overdueCount++;
  }

  // first 8 tasks for the recent list
  const recentTasks = tasks.slice(0, 8);

  // first name only for the greeting
  let firstName = 'there';
  if (user && user.name) {
    firstName = user.name.split(' ')[0];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Hi {firstName} 👋
        </h1>
        <p className="text-slate-500 text-sm">
          {isAdmin ? 'Workspace overview across all projects.' : 'Here are the tasks assigned to you.'}
        </p>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <>
          {/* stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="To do" value={todoCount} tone="slate" />
            <StatCard label="In progress" value={inProgressCount} tone="amber" />
            <StatCard label="Done" value={doneCount} tone="emerald" />
            <StatCard label="Overdue" value={overdueCount} tone="red" />
          </div>

          {/* recent tasks list */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">Recent tasks</h2>
              <Link to="/tasks" className="text-sm text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <div className="text-sm text-slate-500">No tasks yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentTasks.map((t) => (
                  <li key={t._id} className="py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.project ? t.project.name : '—'} · due {formatDate(t.dueDate)}
                        {isOverdue(t) && (
                          <span className="text-red-600 ml-1">(overdue)</span>
                        )}
                      </div>
                    </div>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* projects section */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">Projects</h2>
              <Link to="/projects" className="text-sm text-brand-600 hover:underline">
                Manage
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="text-sm text-slate-500">
                {isAdmin ? 'Create a project to get started.' : "You haven't been added to any project yet."}
              </div>
            ) : (
              <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {projects.slice(0, 6).map((p) => {
                  const memberCount = p.members ? p.members.length : 0;
                  return (
                    <li key={p._id}>
                      <Link
                        to={'/projects/' + p._id}
                        className="block p-3 rounded-md border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition"
                      >
                        <div className="font-medium text-slate-900 truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {memberCount} member{memberCount === 1 ? '' : 's'}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// little stat card component
function StatCard({ label, value, tone }) {
  let toneClass = 'text-slate-700';
  if (tone === 'amber') toneClass = 'text-amber-700';
  else if (tone === 'emerald') toneClass = 'text-emerald-700';
  else if (tone === 'red') toneClass = 'text-red-700';

  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={'text-2xl font-semibold mt-1 ' + toneClass}>{value}</div>
    </div>
  );
}
