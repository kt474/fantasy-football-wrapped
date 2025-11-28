<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

const mostPoints = computed(() => {
  const allPointsWithDetails = props.tableData.flatMap((obj) =>
    obj.pointSeason.flatMap((seasonObj: any) =>
      seasonObj.points.map((point: number, index: number) => ({
        week: index + 1,
        name: obj.name,
        username: obj.username,
        season: seasonObj.season,
        point,
      }))
    )
  );

  const sortedPointsWithDetails = allPointsWithDetails.sort(
    (a, b) => b.point - a.point
  );

  return sortedPointsWithDetails.slice(0, 10);
});
</script>
<template>
  <div
    class="stat-card"
    :class="store.darkMode ? 'stat-card--dark' : 'stat-card--light'"
  >
    <div class="stat-card__glow" aria-hidden="true"></div>
    <div class="stat-header">
      <div class="stat-pill">Weekly High Scores</div>
      <div class="stat-title">All-Time Week Explosions</div>
      <p class="stat-subtitle">
        Top ten single-week heaters across every season in the league.
      </p>
    </div>

    <div class="stat-table__wrapper">
      <table class="stat-table">
        <thead>
          <tr>
            <th class="stat-head">Rank</th>
            <th class="stat-head">Team</th>
            <th class="stat-head stat-head--right">Points</th>
            <th class="stat-head">Season</th>
            <th class="stat-head">Week</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in mostPoints"
            :key="index"
            :class="[
              'stat-row',
              index === 0 ? 'stat-row--top' : '',
              index % 2 === 1 ? 'stat-row--striped' : '',
            ]"
          >
            <td class="stat-cell">
              <div :class="['stat-rank', index !== 0 ? 'stat-rank--secondary' : '']">
                {{ index + 1 }}
              </div>
            </td>
            <th scope="row" class="stat-cell stat-cell__team">
              {{ store.showUsernames ? item.username : item.name }}
            </th>
            <td class="stat-cell stat-cell__numeric">
              {{ item.point }}
            </td>
            <td class="stat-cell">
              {{ item.season }}
            </td>
            <td class="stat-cell">
              {{ item.week }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<style scoped>
.stat-card {
  position: relative;
  width: 100%;
  max-width: 900px;
  overflow: hidden;
  border-radius: 18px;
  padding: 18px 18px 12px 18px;
  border: 1px solid var(--card-border);
  background: radial-gradient(
        120% 140% at 0% 0%,
        rgba(6, 182, 212, 0.12),
        transparent 45%
      ),
    radial-gradient(
        120% 140% at 100% 0%,
        rgba(249, 115, 22, 0.14),
        transparent 46%
      ),
    var(--card-bg);
  box-shadow: 0 20px 70px -50px rgba(0, 0, 0, 0.65);
}

.stat-card__glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08),
    transparent 40%,
    rgba(255, 255, 255, 0.02)
  );
  filter: blur(2px);
  pointer-events: none;
}

.stat-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 4px 12px 4px;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #0b1221;
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.5);
}

.stat-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.stat-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 520px;
}

.stat-table__wrapper {
  position: relative;
  z-index: 1;
  overflow-x: auto;
  padding: 0 2px 10px 2px;
}

.stat-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;
  table-layout: auto;
}

.stat-head {
  padding: 10px 10px;
  text-align: left;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.stat-head--right {
  text-align: right;
}

.stat-row {
  background: var(--row-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  transition: transform 160ms ease, box-shadow 200ms ease, border-color 180ms ease;
}

.stat-row--striped {
  background: var(--row-alt);
}

.stat-row--top {
  border-color: var(--accent-1);
  box-shadow: 0 16px 36px -28px var(--accent-1);
}

.stat-row:hover {
  transform: translateY(-2px);
  border-color: var(--accent-2);
  box-shadow: 0 16px 32px -30px rgba(0, 0, 0, 0.45);
}

.stat-row th:first-child,
.stat-row td:first-child {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.stat-row th:last-child,
.stat-row td:last-child {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}

.stat-cell {
  padding: 12px 12px;
  font-size: 14px;
  color: var(--text-primary);
}

.stat-cell__team {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-cell__numeric {
  text-align: right;
  font-weight: 700;
}

.stat-rank {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  font-weight: 800;
  color: #0b1221;
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  box-shadow: 0 10px 30px -18px var(--accent-1);
}

.stat-rank--secondary {
  background: var(--card-surface);
  color: var(--text-primary);
  border: 1px solid var(--card-border);
  box-shadow: none;
}

.stat-card--light {
  --card-bg: #f1f5f9;
  --card-surface: #ffffff;
  --card-border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --row-bg: #ffffff;
  --row-alt: #f8fafc;
  --accent-1: #06b6d4;
  --accent-2: #f97316;
}

.stat-card--dark {
  --card-bg: #0b1221;
  --card-surface: #111827;
  --card-border: #1f2937;
  --text-primary: #e5e7eb;
  --text-secondary: #94a3b8;
  --row-bg: rgba(30, 41, 59, 0.72);
  --row-alt: rgba(15, 23, 42, 0.76);
  --accent-1: #22d3ee;
  --accent-2: #fb923c;
}

@media (max-width: 640px) {
  .stat-card {
    padding: 16px 12px;
  }

  .stat-title {
    font-size: 18px;
  }

  .stat-head {
    font-size: 10px;
  }

  .stat-cell {
    font-size: 13px;
  }
}
</style>
