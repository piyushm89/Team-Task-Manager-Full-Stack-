import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function Tasks() {
  const { user, isAdmin } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [scope, setScope] = useState('mine'); // 'mine' or 'all'
  const [overdueOnly, setOverdueOnly] = useState(false);

  // load tasks whenever filters change
  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);

      // build query params
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (overdueOnly) params.overdue = 'true';
      if (scope === 'mine') params.mine = 'true';

      try {
        const response = await api.get('/api/tasks', { params: params });
        if (!cancelled) {
          setTasks(response.data.tasks || []);
        }
      } catch (err) {
        console.log(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTasks();

    return () => { cancelled = true; };
  }, [statusFilter, scope, overdueOnly]);

  // change task status
  async function changeStatus(task, newStatus) {
    try {
      await api.patch('/api/tasks/' + task._id, { status: newStatus });
      // update local state
      setTasks((prev) =>
        prev.map((x) => (x._id === task._id ? { ...x, status: newStatus } : x))
      );
    } catch (err) {
      let msg = 'Update failed';
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      alert(msg);
    }
  }

  // group tasks by status into 3 columns
  const todoTasks = [];
  const inProgressTasks = [];
  const doneTasks = [];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (t.status === 'in_progress') {
      inProgressTasks.push(t);
    } else if (t.status === 'done') {
      doneTasks.push(t);
    } else {
      todoTasks.push(t);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
      </div>

      {/* filters */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-slate-500 mr-1">Show:</span>
          <button
            onClick={() => setScope('mine')}
            className={
              'px-2 py-1 rounded ' +
              (scope === 'mine'
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100')
            }
          >
            My tasks
          </button>
          {isAdmin && (
            <button
              onClick={() => setScope('all')}
              className={
                'px-2 py-1 rounded ' +
                (scope === 'all'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100')
              }
            >
              All
            </button>
          )}
        </div>

        <select
          className="input max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          Overdue only
        </label>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">
          No tasks match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Column
            title="To do"
            items={todoTasks}
            user={user}
            isAdmin={isAdmin}
            onStatus={changeStatus}
          />
          <Column
            title="In progress"
            items={inProgressTasks}
            user={user}
            isAdmin={isAdmin}
            onStatus={changeStatus}
          />
          <Column
            title="Done"
            items={doneTasks}
            user={user}
            isAdmin={isAdmin}
            onStatus={changeStatus}
          />
        </div>
      )}
    </div>
  );
}

// kanban column - shows a list of tasks
function Column({ title, items, user, isAdmin, onStatus }) {
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>

      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-xs text-slate-400 px-1 py-2">Nothing here.</li>
        )}

        {items.map((t) => {
          const overdue =
            t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date();
          const isMine = t.assignedTo && t.assignedTo._id === user._id;

          return (
            <li
              key={t._id}
              className="border border-slate-200 rounded-md p-2.5 bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm text-slate-900">{t.title}</div>
                <PriorityBadge priority={t.priority} />
              </div>

              <div className="text-xs text-slate-500 mt-1">
                {t.project ? (
                  <Link
                    to={'/projects/' + t.project._id}
                    className="hover:underline"
                  >
                    {t.project.name}
                  </Link>
                ) : (
                  '—'
                )}
                {' · '}
                <span className={overdue ? 'text-red-600' : ''}>
                  due {formatDate(t.dueDate)}
                </span>
              </div>

              <div className="text-xs text-slate-500 mt-1">
                {t.assignedTo
                  ? 'Assigned to ' + t.assignedTo.name
                  : 'Unassigned'}
              </div>

              {(isMine || isAdmin) && (
                <select
                  value={t.status}
                  onChange={(e) => onStatus(t, e.target.value)}
                  className="mt-2 text-xs border border-slate-200 rounded px-1 py-0.5 w-full"
                >
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
