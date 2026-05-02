import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

// format date or return dash
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();

  // main data
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // task form fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // member picker state
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState('');

  // load project, tasks and users
  async function loadAll() {
    setLoading(true);
    setPageError('');

    try {
      const projectResponse = await api.get('/api/projects/' + id);
      const tasksResponse = await api.get('/api/tasks', { params: { project: id } });
      const usersResponse = await api.get('/api/users');

      setProject(projectResponse.data.project);
      setTasks(tasksResponse.data.tasks || []);
      setUsers(usersResponse.data.users || []);
    } catch (err) {
      let msg = 'Could not load project';
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }

  // reload when project id changes
  useEffect(() => {
    loadAll();
  }, [id]);

  // get list of users that can be assignees (owner + members)
  function getAssigneeOptions() {
    if (!project) return [];

    const seen = new Set();
    const list = [];

    if (project.owner) {
      seen.add(project.owner._id);
      list.push(project.owner);
    }

    if (project.members) {
      for (let i = 0; i < project.members.length; i++) {
        const m = project.members[i];
        if (!seen.has(m._id)) {
          seen.add(m._id);
          list.push(m);
        }
      }
    }

    return list;
  }

  // open modal for creating a new task
  function openCreateTask() {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskAssignee('');
    setTaskStatus('todo');
    setTaskPriority('medium');
    setTaskDueDate('');
    setTaskModalOpen(true);
  }

  // open modal to edit an existing task
  function openEditTask(t) {
    setEditingTask(t);
    setTaskTitle(t.title || '');
    setTaskDescription(t.description || '');
    setTaskAssignee(t.assignedTo ? t.assignedTo._id : '');
    setTaskStatus(t.status);
    setTaskPriority(t.priority);
    setTaskDueDate(t.dueDate ? t.dueDate.slice(0, 10) : '');
    setTaskModalOpen(true);
  }

  // save task (create or update)
  async function saveTask(e) {
    if (e) e.preventDefault();
    if (!taskTitle.trim()) return;

    setSavingTask(true);

    const body = {
      title: taskTitle.trim(),
      description: taskDescription,
      assignedTo: taskAssignee || null,
      status: taskStatus,
      priority: taskPriority,
      dueDate: taskDueDate || null
    };

    try {
      if (editingTask) {
        // update existing
        await api.patch('/api/tasks/' + editingTask._id, body);
      } else {
        // create new - also send the project id
        body.project = id;
        await api.post('/api/tasks', body);
      }

      setTaskModalOpen(false);
      await loadAll();
    } catch (err) {
      let msg = 'Save failed';
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      alert(msg);
    } finally {
      setSavingTask(false);
    }
  }

  async function deleteTask(taskId) {
    const ok = confirm('Delete this task?');
    if (!ok) return;

    try {
      await api.delete('/api/tasks/' + taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      alert('Delete failed');
    }
  }

  // change status from dropdown
  async function changeStatus(task, newStatus) {
    try {
      await api.patch('/api/tasks/' + task._id, { status: newStatus });
      // update locally so UI updates fast
      setTasks((prev) =>
        prev.map((x) => (x._id === task._id ? { ...x, status: newStatus } : x))
      );
    } catch (err) {
      alert('Update failed');
    }
  }

  async function addMember(e) {
    if (e) e.preventDefault();
    if (!memberToAdd) return;

    try {
      await api.post('/api/projects/' + id + '/members', { userId: memberToAdd });
      setMemberModalOpen(false);
      setMemberToAdd('');
      await loadAll();
    } catch (err) {
      let msg = 'Could not add member';
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      alert(msg);
    }
  }

  async function removeMember(userId) {
    const ok = confirm('Remove this member?');
    if (!ok) return;

    try {
      await api.delete('/api/projects/' + id + '/members/' + userId);
      await loadAll();
    } catch (err) {
      alert('Failed');
    }
  }

  // early returns
  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (pageError) return <div className="text-red-600">{pageError}</div>;
  if (!project) return null;

  const assigneeOptions = getAssigneeOptions();

  return (
    <div className="space-y-6">
      {/* project header */}
      <div>
        <Link to="/projects" className="text-sm text-brand-600 hover:underline">
          ← All projects
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">{project.name}</h1>
        <p className="text-sm text-slate-500">
          {project.description || 'No description'}
        </p>
      </div>

      {/* members section */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Members</h2>
          {isAdmin && (
            <button
              onClick={() => setMemberModalOpen(true)}
              className="btn-primary text-xs"
            >
              + Add member
            </button>
          )}
        </div>

        <ul className="flex flex-wrap gap-2">
          {/* show owner first */}
          <li className="badge bg-brand-50 text-brand-700">
            {project.owner ? project.owner.name : ''}{' '}
            <span className="ml-1 text-[10px] uppercase tracking-wide">owner</span>
          </li>

          {/* then other members */}
          {project.members && project.members.map((m) => (
            <li key={m._id} className="badge bg-slate-100 text-slate-700">
              {m.name}
              {isAdmin && (
                <button
                  onClick={() => removeMember(m._id)}
                  className="ml-2 text-slate-400 hover:text-red-600"
                  title="Remove"
                >
                  ×
                </button>
              )}
            </li>
          ))}

          {(!project.members || project.members.length === 0) && (
            <li className="text-sm text-slate-500">No additional members.</li>
          )}
        </ul>
      </section>

      {/* tasks section */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Tasks</h2>
          {isAdmin && (
            <button onClick={openCreateTask} className="btn-primary text-xs">
              + New task
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="text-sm text-slate-500">No tasks yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2">Title</th>
                <th className="text-left py-2">Assignee</th>
                <th className="text-left py-2">Priority</th>
                <th className="text-left py-2">Due</th>
                <th className="text-left py-2">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => {
                const overdue =
                  t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date();
                const isMine = t.assignedTo && t.assignedTo._id === user._id;

                return (
                  <tr key={t._id}>
                    <td className="py-2">
                      <div className="font-medium text-slate-900">{t.title}</div>
                      {t.description && (
                        <div className="text-xs text-slate-500 truncate max-w-md">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-slate-700">
                      {t.assignedTo ? t.assignedTo.name : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className={'py-2 ' + (overdue ? 'text-red-600' : 'text-slate-700')}>
                      {formatDate(t.dueDate)}
                    </td>
                    <td className="py-2">
                      {isMine || isAdmin ? (
                        <select
                          value={t.status}
                          onChange={(e) => changeStatus(t, e.target.value)}
                          className="text-xs border border-slate-200 rounded px-1 py-0.5"
                        >
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      ) : (
                        <StatusBadge status={t.status} />
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditTask(t)}
                            className="text-xs text-brand-600 hover:underline mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTask(t._id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* task modal */}
      <Modal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingTask ? 'Edit task' : 'New task'}
        footer={
          <>
            <button onClick={() => setTaskModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={saveTask} className="btn-primary" disabled={savingTask}>
              {savingTask ? 'Saving…' : editingTask ? 'Save' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={saveTask} className="space-y-3">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[70px]"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assignee</label>
              <select
                className="input"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Due date</label>
              <input
                type="date"
                className="input"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value)}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* add member modal */}
      <Modal
        open={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Add member"
        footer={
          <>
            <button
              onClick={() => setMemberModalOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button onClick={addMember} className="btn-primary">
              Add
            </button>
          </>
        }
      >
        <form onSubmit={addMember} className="space-y-3">
          <p className="text-sm text-slate-500">Pick a user from your workspace.</p>
          <select
            className="input"
            value={memberToAdd}
            onChange={(e) => setMemberToAdd(e.target.value)}
          >
            <option value="">— choose —</option>
            {users
              .filter((u) => u._id !== project.owner._id)
              .filter((u) => {
                // skip users who are already members
                if (!project.members) return true;
                for (let i = 0; i < project.members.length; i++) {
                  if (project.members[i]._id === u._id) return false;
                }
                return true;
              })
              .map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
          </select>
        </form>
      </Modal>
    </div>
  );
}
