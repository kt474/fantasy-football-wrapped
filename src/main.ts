import { createApp } from "vue";
import { createPinia } from "pinia";
import VueApexCharts from "vue3-apexcharts";
import "./index.css";
import App from "./App.vue";
// @ts-ignore
import posthogPlugin from "../plugins/posthog";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(VueApexCharts);
app.use(posthogPlugin);
app.mount("#app");
