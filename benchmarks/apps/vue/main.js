import { createApp } from 'vue';
import App from './App.vue';

const vm = createApp(App).mount('#app');
setTimeout(() => { window.__ready = performance.now(); });
window.bench = vm;
