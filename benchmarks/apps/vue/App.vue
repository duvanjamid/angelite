<script setup>
import { shallowRef, ref } from 'vue';
import { buildRows, updateEveryTenth, swapRows, removeRow } from '../shared.js';

const rows = shallowRef([]);
const selected = ref(0);

defineExpose({
  run: n => { rows.value = buildRows(n); },
  add: n => { rows.value = rows.value.concat(buildRows(n)); },
  update: () => { rows.value = updateEveryTenth(rows.value); },
  swap: () => { rows.value = swapRows(rows.value); },
  select: id => { selected.value = id; },
  remove: id => { rows.value = removeRow(rows.value, id); },
  clear: () => { rows.value = []; }
});
</script>

<template>
  <table class="table"><tbody>
    <tr v-for="r in rows" :key="r.id" :class="{ danger: r.id === selected }">
      <td class="col-id">{{ r.id }}</td>
      <td class="col-label"><a @click="selected = r.id">{{ r.label }}</a></td>
      <td class="col-remove"><a @click="rows = removeRow(rows, r.id)">×</a></td>
    </tr>
  </tbody></table>
</template>
