import { render, Component } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import { buildRows, updateEveryTenth, swapRows, removeRow } from '../shared.js';

// Core-only memoisation (no preact/compat) to keep the bundle at Preact's real size.
class Row extends Component {
  shouldComponentUpdate(next) {
    return next.row !== this.props.row || next.selected !== this.props.selected;
  }
  render({ row, selected, onSelect, onRemove }) {
    return (
      <tr class={selected ? 'danger' : ''}>
        <td class="col-id">{row.id}</td>
        <td class="col-label"><a onClick={() => onSelect(row.id)}>{row.label}</a></td>
        <td class="col-remove"><a onClick={() => onRemove(row.id)}>×</a></td>
      </tr>
    );
  }
}

let api;
function App() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(0);
  api = { setRows, setSelected };
  const onSelect = useCallback(id => setSelected(id), []);
  const onRemove = useCallback(id => setRows(r => removeRow(r, id)), []);
  return (
    <table class="table"><tbody>
      {rows.map(r => <Row key={r.id} row={r} selected={r.id === selected} onSelect={onSelect} onRemove={onRemove} />)}
    </tbody></table>
  );
}

render(<App />, document.getElementById('app'));
setTimeout(() => { window.__ready = performance.now(); });
window.bench = {
  run: n => api.setRows(buildRows(n)),
  add: n => api.setRows(r => r.concat(buildRows(n))),
  update: () => api.setRows(updateEveryTenth),
  swap: () => api.setRows(swapRows),
  select: id => api.setSelected(id),
  remove: id => api.setRows(r => removeRow(r, id)),
  clear: () => api.setRows([])
};
