/**
 * Vue 3 / Nuxt интеграц.
 *
 *   import { createApp } from 'vue';
 *   import Hurteemj from 'hurteemj/vue';
 *   createApp(App).use(Hurteemj, { level: 'AA', fix: 'safe' }).mount('#app');
 *
 *   // компонент дотор
 *   const hj = inject('hurteemj'); hj.value?.audit();
 */
import { shallowRef } from 'vue';

export default {
  install(app, config = {}) {
    const api = shallowRef(null);
    app.provide('hurteemj', api);
    app.config.globalProperties.$hurteemj = api;
    if (typeof window === 'undefined') return; // SSR
    import('../../dist/hurteemj.esm.js').then(({ init }) => { api.value = init(config); });
    // Vue Router ашиглаж байвал навигацийн дараа дахин шалгана
    const router = app.config.globalProperties.$router;
    router?.afterEach(() => setTimeout(() => api.value?.audit(), 300));
  },
};
