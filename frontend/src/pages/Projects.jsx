import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Projects() {
  const { isAdmin } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // state for the new project modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // load projects from server
  async function loadProjects() {
    setLoading(true);
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data.projects || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  // run once when page loads
  useEffect(() => {
    loadProjects();
  }, []);

  // create new project
  async function handleCreate(e) {
    if (e) e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/projects', {
        name: name.trim(),
        description: description.trim()
      });

      // close modal and reload
      setShowModal(false);
      setName('');
      setDescription('');
      await loadProjects();
    } catch (err) {
      let msg = 'Could not create project';
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // delete a project
  async function handleDelete(id) {
    const ok = confirm('Delete this project and all its tasks?');
    if (!ok) return;

    try {
      await api.delete('/api/projects/' + id);
      // remove from local list
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      let msg = 'Failed to delete';
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      alert(msg);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">All projects you have access to.</p>
        </div>

        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + New project
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">
          {isAdmin
            ? 'No projects yet — create one to get started.'
            : "You're not part of any projects yet."}
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const memberCount = p.members ? p.members.length : 0;
            const ownerName = p.owner ? p.owner.name : '—';

            return (
              <li key={p._id} className="card p-4 flex flex-col">
                <Link
                  to={'/projects/' + p._id}
                  className="text-base font-semibold text-slate-900 hover:text-brand-600 truncate"
                >
                  {p.name}
                </Link>

                <p className="text-sm text-slate-500 mt-1 line-clamp-2 min-h-[2.5em]">
                  {p.description || <span className="italic">No description</span>}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{memberCount} members</span>
                  <span>Owner: {ownerName}</span>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={'/projects/' + p._id}
                      className="btn-ghost flex-1 text-xs"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="btn-danger text-xs"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* create project modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create project"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleCreate} className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </form>
      </Modal>
    </div>
  );
}
