// shows a colored badge for a task status
export default function StatusBadge({ status }) {
  // map each status to a tailwind class
  let cls = 'bg-slate-100 text-slate-700';
  let label = status;

  if (status === 'todo') {
    cls = 'bg-slate-100 text-slate-700';
    label = 'To do';
  } else if (status === 'in_progress') {
    cls = 'bg-amber-100 text-amber-800';
    label = 'In progress';
  } else if (status === 'done') {
    cls = 'bg-emerald-100 text-emerald-800';
    label = 'Done';
  }

  return <span className={'badge ' + cls}>{label}</span>;
}

// shows a colored badge for a task priority
export function PriorityBadge({ priority }) {
  let cls = 'bg-slate-100 text-slate-700';

  if (priority === 'low') {
    cls = 'bg-blue-100 text-blue-800';
  } else if (priority === 'high') {
    cls = 'bg-red-100 text-red-700';
  }

  return <span className={'badge ' + cls}>{priority}</span>;
}
