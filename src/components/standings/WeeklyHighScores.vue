<script setup lang="ts">
import { computed } from "vue";
import { TableDataType } from "../../types/types";
import { useStore } from "../../store/store";

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();

const weeksPlayed = computed(() => {
  if (!props.tableData || props.tableData.length === 0) return 0;
  return Math.max(
    ...props.tableData.map((team) => (team.points ? team.points.length : 0))
  );
});

const leagueInfo = computed(() => store.leagueInfo[store.currentLeagueIndex]);

const scoredWeeks = computed(() => {
  const lastScored = leagueInfo.value?.lastScoredWeek || 0;
  if (lastScored > 0) return Math.min(lastScored, weeksPlayed.value);
  return weeksPlayed.value;
});

const weeklyLeaders = computed(() => {
  const leaders: {
    week: number;
    points: number;
    team: TableDataType;
  }[] = [];
  for (let weekIndex = 0; weekIndex < scoredWeeks.value; weekIndex++) {
    let bestTeam: TableDataType | undefined;
    let bestScore = -Infinity;
    props.tableData.forEach((team) => {
      const score = team.points?.[weekIndex];
      if (score !== undefined && score !== null && score > bestScore) {
        bestScore = score;
        bestTeam = team;
      }
    });
    if (bestTeam && isFinite(bestScore)) {
      leaders.push({
        week: weekIndex + 1,
        points: Number(bestScore.toFixed(2)),
        team: bestTeam,
      });
    }
  }
  return leaders;
});

const leadersByWeek = computed(() =>
  weeklyLeaders.value.reduce<Record<number, (typeof weeklyLeaders.value)[number]>>(
    (acc, leader) => {
      acc[leader.week] = leader;
      return acc;
    },
    {}
  )
);

const totalWeeks = computed(() => {
  const regularSeasonLength = leagueInfo.value?.regularSeasonLength;
  const candidateWeeks = [
    regularSeasonLength || 0,
    weeksPlayed.value || 0,
    scoredWeeks.value || 0,
  ];
  return Math.max(...candidateWeeks);
});

const highestPoints = computed(() => {
  if (!weeklyLeaders.value.length) return null;
  return Math.max(...weeklyLeaders.value.map((leader) => leader.points));
});

const topWeeklyHigh = computed(() => {
  if (!weeklyLeaders.value.length) return null;
  return weeklyLeaders.value.reduce(
    (best, current) => (current.points > best.points ? current : best),
    weeklyLeaders.value[0]
  );
});

const leaderForWeek = (week: number) => leadersByWeek.value[week];

const formatTeamName = (team: TableDataType) => {
  if (store.showUsernames) {
    return team.username ? team.username : team.name || "Ghost Roster";
  }
  return team.name ? team.name : team.username || "Ghost Roster";
};
</script>

<template>
  <div
    class="weekly-card"
    :class="store.darkMode ? 'weekly-card--dark' : 'weekly-card--light'"
  >
    <div class="weekly-card__glow" aria-hidden="true"></div>
    <div class="weekly-head">
      <div>
        <div class="weekly-pill">Weekly High Scores</div>
        <!-- <div class="weekly-title">Fireworks of the Week</div>
        <p class="weekly-subtitle">Highest starter score from every week.</p> -->
      </div>
      <span class="weekly-badge">
        Weeks {{ scoredWeeks || 0 }} / {{ totalWeeks || 0 }}
      </span>
    </div>

    <div v-if="totalWeeks > 0" class="weekly-table__wrap">
      <table class="weekly-table">
        <thead>
          <tr>
            <th class="weekly-head-cell">Week</th>
            <th class="weekly-head-cell">Team</th>
            <th class="weekly-head-cell weekly-head-cell--right">Points</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="week in totalWeeks"
            :key="week"
            :class="[
              'weekly-row',
              leaderForWeek(week)?.points === highestPoints
                ? 'weekly-row--top'
                : '',
            ]"
          >
            <td class="weekly-cell weekly-cell__week">W{{ week }}</td>
            <td class="weekly-cell">
              <div class="weekly-team">
                <div class="weekly-avatar">
                  <img
                    v-if="leaderForWeek(week)?.team?.avatarImg"
                    :src="leaderForWeek(week)?.team?.avatarImg"
                    alt="Avatar"
                  />
                  <div v-else class="weekly-avatar__placeholder">
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <p class="weekly-team__name">
                    {{
                      leaderForWeek(week)
                        ? formatTeamName(leaderForWeek(week)!.team)
                        : "Pending results"
                    }}
                  </p>
                  <p class="weekly-team__meta">
                    {{
                      leaderForWeek(week)
                        ? `Roster #${leaderForWeek(week)!.team.rosterId}`
                        : "Waiting on kickoff"
                    }}
                  </p>
                </div>
              </div>
            </td>
            <td
              :class="[
                'weekly-cell',
                'weekly-cell__points',
                leaderForWeek(week) ? '' : 'weekly-cell__points--pending',
              ]"
            >
              <div class="weekly-points">
                <span
                  v-if="
                    topWeeklyHigh &&
                    leaderForWeek(week)?.points === topWeeklyHigh.points
                  "
                  class="weekly-points__badge"
                >
                  🔥 Season high
                </span>
                <span class="weekly-points__value">
                  {{ leaderForWeek(week)?.points ?? "Pending" }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="weekly-empty">
      Weekly scores will appear here once games are played.
    </div>
  </div>
</template>

<style scoped>
.weekly-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 16px 16px 12px;
  border: 1px solid var(--card-border);
  background: radial-gradient(
        120% 140% at 0% 0%,
        rgba(56, 189, 248, 0.14),
        transparent 46%
      ),
    radial-gradient(
        120% 160% at 100% 10%,
        rgba(251, 113, 133, 0.12),
        transparent 48%
      ),
    var(--card-bg);
  box-shadow: 0 18px 70px -52px rgba(0, 0, 0, 0.6);
}

.weekly-card__glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08),
    transparent 40%,
    rgba(255, 255, 255, 0.02)
  );
  pointer-events: none;
}

.weekly-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 4px 14px;
}

.weekly-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0b1221;
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  box-shadow: 0 12px 36px -24px var(--accent-1);
}

.weekly-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.weekly-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

.weekly-badge {
  padding: 7px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-2);
  background: var(--chip-bg);
  border: 1px solid var(--card-border);
}

.weekly-table__wrap {
  position: relative;
  z-index: 1;
  overflow-x: auto;
  padding: 0 2px 10px 2px;
}

.weekly-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;
}

.weekly-head-cell {
  padding: 10px 12px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  text-align: left;
}

.weekly-head-cell--right {
  text-align: right;
}

.weekly-row {
  background: var(--row-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  transition: transform 140ms ease, box-shadow 200ms ease, border-color 160ms ease;
}

.weekly-row:nth-child(even) {
  background: var(--row-alt);
}

.weekly-row--top {
  border-color: var(--accent-1);
  /* box-shadow: 0 14px 30px -26px var(--accent-1); */
}

.weekly-row:hover {
  transform: translateY(-2px);
  border-color: var(--accent-2);
  box-shadow: 0 14px 34px -28px rgba(0, 0, 0, 0.45);
}

.weekly-row th:first-child,
.weekly-row td:first-child {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.weekly-row th:last-child,
.weekly-row td:last-child {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}

.weekly-cell {
  padding: 12px 12px;
  font-size: 14px;
  color: var(--text-primary);
}

.weekly-cell__week {
  font-weight: 800;
  color: var(--accent-1);
}

.weekly-team {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weekly-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  background: var(--card-surface);
  display: grid;
  place-items: center;
}

.weekly-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.weekly-avatar__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
}

.weekly-team__name {
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.weekly-team__meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.weekly-cell__points {
  text-align: right;
  font-weight: 800;
  color: var(--accent-2);
}

.weekly-cell__points--pending {
  color: var(--text-secondary);
  font-weight: 700;
}

.weekly-points {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.weekly-points__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  color: #b91c1c;
  background: rgba(248, 113, 113, 0.16);
  border: 1px solid rgba(248, 113, 113, 0.3);
  white-space: nowrap;
}

.weekly-empty {
  position: relative;
  z-index: 1;
  padding: 14px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--row-bg);
  border: 1px dashed var(--card-border);
  border-radius: 12px;
}

.weekly-card--light {
  --card-bg: #f8fafc;
  --card-surface: #ffffff;
  --card-border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --row-bg: #ffffff;
  --row-alt: #f8fafc;
  --accent-1: #22d3ee;
  --accent-2: #fb7185;
  --chip-bg: rgba(15, 23, 42, 0.04);
}

.weekly-card--dark {
  --card-bg: #0b1221;
  --card-surface: #111827;
  --card-border: #1f2937;
  --text-primary: #e5e7eb;
  --text-secondary: #94a3b8;
  --row-bg: rgba(30, 41, 59, 0.78);
  --row-alt: rgba(15, 23, 42, 0.72);
  --accent-1: #22d3ee;
  --accent-2: #fb7185;
  --chip-bg: rgba(255, 255, 255, 0.04);
}

@media (max-width: 640px) {
  .weekly-card {
    padding: 14px 12px;
  }

  .weekly-head {
    flex-direction: column;
  }

  .weekly-title {
    font-size: 18px;
  }

  .weekly-cell {
    font-size: 13px;
  }
}
</style>
