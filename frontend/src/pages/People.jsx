import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function People() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // load all users
  async function loadUsers() {
    setLoading(true);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // change a user's role
  async function changeRole(userId, newRole) {
    try {
      const response = await api.patch('/api/users/' + userId + '/role', {
        role: newRole
      });
      // update the user in our list
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? response.data.user : u))
      );
    } catch (err) {
      let msg = 'Could not update role';
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      alert(msg);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">People</h1>
      <p className="text-sm text-slate-500 mb-5">
        Workspace members and their roles.
      </p>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u._id === me._id;
                const joined = u.createdAt
                  ? new Date(u.createdAt).toLocaleDateString()
                  : '—';

                return (
                  <tr key={u._id}>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {u.name}
                      {isSelf && (
                        <span className="text-xs text-slate-400 ml-1">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{u.email}</td>
                    <td className="px-4 py-2">
                      <select
                        className="input max-w-[140px]"
                        value={u.role}
                        onChange={(e) => changeRole(u._id, e.target.value)}
                        disabled={isSelf}
                        title={isSelf ? "You can't change your own role" : ''}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{joined}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
