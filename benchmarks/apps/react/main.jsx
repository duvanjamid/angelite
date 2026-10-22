import { memo, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { buildRows, updateEveryTenth, swapRows, removeRow } from '../shared.js';

const Row = memo(function Row({ row, selected, onSelect, onRemove }) {
  return (
    <tr className={selected ? 'danger' : ''}>
      <td className="col-id">{row.id}</td>
      <td className="col-label"><a onClick={() => onSelect(row.id)}>{row.label}</a></td>
      <td className="col-remove"><a onClick={() => onRemove(row.id)}>×</a></td>
    </tr>
  );
});

let api;
function App() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(0);
  api = { setRows, setSelected };
  const onSelect = useCallback(id => setSelected(id), []);
  const onRemove = useCallback(id => setRows(r => removeRow(r, id)), []);
  return (
    <table className="table"><tbody>
      {rows.map(r => <Row key={r.id} row={r} selected={r.id === selected} onSelect={onSelect} onRemove={onRemove} />)}
    </tbody></table>
  );
}

createRoot(document.getElementById('app')).render(<App />);
queueMicrotask(() => setTimeout(() => { window.__ready = performance.now(); }));
window.bench = {
  run: n => api.setRows(buildRows(n)),
  add: n => api.setRows(r => r.concat(buildRows(n))),
  update: () => api.setRows(updateEveryTenth),
  swap: () => api.setRows(swapRows),
  select: id => api.setSelected(id),
  remove: id => api.setRows(r => removeRow(r, id)),
  clear: () => api.setRows([])
};
