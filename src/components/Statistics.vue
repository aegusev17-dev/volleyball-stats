<template>
  <div class="statistics">
    <h2>📊 Статистика команды</h2>

    <div v-if="!hasPlayers" class="empty-state">
      <p>⚠️ Добавьте игроков и проведите матч</p>
    </div>

    <div v-else>
      <div class="stats-table-wrapper">
        <table class="stats-table">
          <thead>
            <tr>
              <th rowspan="2">#</th>
              <th rowspan="2">Игрок</th>
              <th colspan="5">Стартовая позиция</th>
              <th rowspan="2">Очки ±</th>
              <th colspan="3">Подача</th>
              <th colspan="3">Прием</th>
              <th colspan="5">Атака</th>
              <th rowspan="2">Блок</th>
            </tr>
            <tr>
              <!-- <th v-for="set in 5" :key="set" class="set-header" :class="{
                'serving-set': isOurServeInSet(set)
              }">
                {{ set }}
              </th> -->
              <th
                v-for="set in 5"
                :key="set"
                class="set-header"
              >
                <span
                  v-if="isOurServeInSet(set)"
                  class="serving-set"
                >
                  {{ set }}
                </span>
                <span v-else>
                  {{ set }}
                </span>
              </th>
              <th>Всего</th>
              <th>Ошиб</th>
              <th>Эйс</th>
              <th>Всего</th>
              <th>Ошиб</th>
              <th>%+</th>
              <th>Всего</th>
              <th>Ошиб</th>
              <th>Блок</th>
              <th>Очко</th>
              <th>Очк%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in allPlayers" :key="player.id">
              <td>{{ player.number }}</td>
              <td class="player-name">{{ player.name }}</td>

              <!-- Стартовые позиции по сетам -->
              <td v-for="set in 5" :key="set" class="player-zone">
                <template v-if="isLiberoInSet(player, set)">
                  <span class="libero-tag">L</span>
                </template>
                <template v-else>
                  <div class="zone-cell">
                    <span class="zone-number">{{ getStartingZone(player, set) || '-' }}</span>
                    <span v-if="isSubstituted(player, set)" class="sub-indicator">□</span>
                  </div>
                </template>
              </td>

              <td class="stat-points">
                {{ getPlayerPoints(player) }}
                <span class="points-diff" :class="getPointsDiffClass(getPlayerPointsDiff(player))">
                  ({{ getPlayerPointsDiff(player) > 0 ? '+' : '' }}{{ getPlayerPointsDiff(player) }})
                </span>
              </td>
              <td class="stat-serve">{{ getPlayerServeTotal(player) }}</td>
              <td class="stat-serve-error">{{ getPlayerServeErrors(player) }}</td>
              <td class="stat-serve-ace">{{ getPlayerServeAces(player) }}</td>
              <td class="stat-reception">{{ getPlayerReceptionTotal(player) }}</td>
              <td class="stat-reception-error">{{ getPlayerReceptionErrors(player) }}</td>
              <td class="stat-reception-percent">{{ getPlayerReceptionPercent(player) }}%</td>
              <td class="stat-attack">{{ getPlayerAttackTotal(player) }}</td>
              <td class="stat-attack-error">{{ getPlayerAttackErrors(player) }}</td>
              <td class="stat-attack-block">{{ getPlayerAttackBlocks(player) }}</td>
              <td class="stat-attack-kill">{{ getPlayerAttackKills(player) }}</td>
              <td class="stat-attack-percent">{{ getPlayerAttackEfficiency(player) }}%</td>
              <td class="stat-block">{{ getPlayerBlocks(player) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2"><strong>Суммарно</strong></td>
              <td colspan="5"></td>
              <td class="stat-points">
                <strong>{{ teamStats.points }}</strong>
                <span class="points-diff" :class="getPointsDiffClass(teamStats.pointsDiff || 0)">
                  ({{ teamStats.pointsDiff > 0 ? '+' : '' }}{{ teamStats.pointsDiff || 0 }})
                </span>
              </td>
              <td class="stat-serve"><strong>{{ teamStats.serves.total }}</strong></td>
              <td class="stat-serve-error"><strong>{{ teamStats.serves.errors }}</strong></td>
              <td class="stat-serve-ace"><strong>{{ teamStats.serves.aces }}</strong></td>
              <td class="stat-reception"><strong>{{ teamStats.receptions.total }}</strong></td>
              <td class="stat-reception-error"><strong>{{ teamStats.receptions.errors }}</strong></td>
              <td class="stat-reception-percent"><strong>{{ teamStats.receptionPercent }}%</strong></td>
              <td class="stat-attack"><strong>{{ teamStats.attacks.total }}</strong></td>
              <td class="stat-attack-error"><strong>{{ teamStats.attacks.errors }}</strong></td>
              <td class="stat-attack-block"><strong>{{ getTotalAttackBlocks() }}</strong></td>
              <td class="stat-attack-kill"><strong>{{ teamStats.attacks.kills }}</strong></td>
              <td class="stat-attack-percent"><strong>{{ teamStats.attackEfficiency }}%</strong></td>
              <td class="stat-block"><strong>{{ teamStats.blocks.points }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Графики -->
      <div class="charts">
        <h3>📈 Эффективность атаки</h3>
        <div class="chart-container">
          <canvas id="attackChart"></canvas>
        </div>

        <h3>📊 Распределение очков по игрокам</h3>
        <div class="chart-container">
          <canvas id="pointsChart"></canvas>
        </div>

        <h3>📊 Эффективность приема</h3>
        <div class="chart-container">
          <canvas id="receptionChart"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useMatchStore } from '@/stores/matchStore'
import Chart from 'chart.js/auto'

const store = useMatchStore()
const attackChart = ref(null)
const pointsChart = ref(null)
const receptionChart = ref(null)

// === ВСЕ ИГРОКИ ===
const allPlayers = computed(() => {
  return store.team?.players || []
})

const hasPlayers = computed(() => {
  return (store.team?.players?.length || 0) > 0
})

// === ПРАВИЛЬНАЯ ЛОГИКА ОБВОДКИ СЕТОВ ===
function isOurServeInSet(set) {
  // Для 1-го сета - берем из setServing
  if (set === 1) {
    if (store.team?.setServing && store.team.setServing[1] !== undefined) {
      return store.team.setServing[1] === true
    }
    return false
  }

  // Для 5-го сета - отдельный жребий
  if (set === 5) {
    if (store.team?.setServing && store.team.setServing[5] !== undefined) {
      return store.team.setServing[5] === true
    }
    return false
  }

  // Для 2-го, 3-го, 4-го сетов - определяем по 1-му сету
  const firstSetServing = store.team?.setServing && store.team.setServing[1] !== undefined
    ? store.team.setServing[1]
    : null

  if (firstSetServing === null) {
    return false
  }

  if (set === 2) return !firstSetServing
  if (set === 3) return firstSetServing
  if (set === 4) return !firstSetServing

  return false
}

// === СТАРТОВЫЕ ПОЗИЦИИ ===
function getStartingZone(player, set) {
  const positions = store.team?.startingPositions || {}
  const setPositions = positions[set] || {}
  const zone = setPositions[player.id]
  if (zone === 'L') return null
  return zone || null
}

function isLiberoInSet(player, set) {
  const positions = store.team?.startingPositions || {}
  const setPositions = positions[set] || {}
  return setPositions[player.id] === 'L'
}

function isLibero(player) {
  return player?.id === store.team?.libero?.id
}

function isSubstituted(player, set) {
  const substitutions = store.events?.filter(e =>
    e.type === 'substitution' &&
    e.setNumber === set &&
    (e.playerIn?.id === player.id || e.playerOut?.id === player.id)
  ) || []
  return substitutions.length > 0
}

// === ФУНКЦИИ СТАТИСТИКИ ИГРОКА ===
function getPlayerStats(player) {
  const s = player.stats || {}
  const attacks = s.attacks || { total: 0, kills: 0, errors: 0, digs: 0 }
  const serves = s.serves || { total: 0, aces: 0, errors: 0 }
  const blocks = s.blocks || { total: 0, points: 0, errors: 0 }
  const receptions = s.receptions || { total: 0, perfect: 0, positive: 0, errors: 0 }

  return {
    points: (attacks.kills || 0) + (serves.aces || 0) + (blocks.points || 0),
    serves: serves,
    receptions: receptions,
    attacks: attacks,
    blocks: blocks
  }
}

function getPlayerPoints(player) {
  return getPlayerStats(player).points
}

function getPlayerPointsDiff(player) {
  const stats = getPlayerStats(player)
  return stats.points - (stats.attacks.errors || 0) - (stats.serves.errors || 0)
}

function getPlayerServeTotal(player) {
  return getPlayerStats(player).serves.total || 0
}

function getPlayerServeErrors(player) {
  return getPlayerStats(player).serves.errors || 0
}

function getPlayerServeAces(player) {
  return getPlayerStats(player).serves.aces || 0
}

function getPlayerReceptionTotal(player) {
  return getPlayerStats(player).receptions.total || 0
}

function getPlayerReceptionErrors(player) {
  return getPlayerStats(player).receptions.errors || 0
}

function getPlayerReceptionPercent(player) {
  const r = getPlayerStats(player).receptions
  if (r.total === 0) return 0
  return Math.round(((r.perfect + r.positive) / r.total) * 100)
}

function getPlayerAttackTotal(player) {
  return getPlayerStats(player).attacks.total || 0
}

function getPlayerAttackErrors(player) {
  return getPlayerStats(player).attacks.errors || 0
}

function getPlayerAttackBlocks(player) {
  return getPlayerStats(player).attacks.digs || 0
}

function getPlayerAttackKills(player) {
  return getPlayerStats(player).attacks.kills || 0
}

function getPlayerAttackEfficiency(player) {
  const a = getPlayerStats(player).attacks
  if (a.total === 0) return 0
  return Math.round((a.kills / a.total) * 100)
}

function getPlayerBlocks(player) {
  return getPlayerStats(player).blocks.points || 0
}

function getPointsDiffClass(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

// === КОМАНДНАЯ СТАТИСТИКА ===
const teamStats = computed(() => {
  const players = allPlayers.value
  let total = {
    points: 0,
    serves: { total: 0, aces: 0, errors: 0 },
    receptions: { total: 0, perfect: 0, positive: 0, errors: 0 },
    attacks: { total: 0, kills: 0, errors: 0, digs: 0 },
    blocks: { total: 0, points: 0, errors: 0 }
  }

  players.forEach(p => {
    const stats = getPlayerStats(p)
    total.points += stats.points
    total.serves.total += stats.serves.total
    total.serves.aces += stats.serves.aces
    total.serves.errors += stats.serves.errors
    total.receptions.total += stats.receptions.total
    total.receptions.perfect += stats.receptions.perfect
    total.receptions.positive += stats.receptions.positive
    total.receptions.errors += stats.receptions.errors
    total.attacks.total += stats.attacks.total
    total.attacks.kills += stats.attacks.kills
    total.attacks.errors += stats.attacks.errors
    total.attacks.digs += stats.attacks.digs
    total.blocks.total += stats.blocks.total
    total.blocks.points += stats.blocks.points
    total.blocks.errors += stats.blocks.errors
  })

  const receptionPercent = total.receptions.total > 0
    ? Math.round(((total.receptions.perfect + total.receptions.positive) / total.receptions.total) * 100)
    : 0
  const attackEfficiency = total.attacks.total > 0
    ? Math.round((total.attacks.kills / total.attacks.total) * 100)
    : 0
  const pointsDiff = total.points - (total.attacks.errors || 0) - (total.serves.errors || 0)

  return {
    ...total,
    receptionPercent,
    attackEfficiency,
    pointsDiff
  }
})

function getTotalAttackBlocks() {
  return teamStats.value.attacks.digs || 0
}

// === ГРАФИКИ ===
function renderCharts() {
  nextTick(() => {
    renderAttackChart()
    renderPointsChart()
    renderReceptionChart()
  })
}

function renderAttackChart() {
  if (attackChart.value) {
    attackChart.value.destroy()
  }

  const players = allPlayers.value.filter(p => {
    const a = getPlayerStats(p).attacks
    return a.total > 0
  })

  const labels = players.map(p => `#${p.number} ${p.name}`)
  const data = players.map(p => getPlayerAttackEfficiency(p))
  const colors = data.map(v => {
    if (v >= 50) return '#4caf50'
    if (v >= 30) return '#ff9800'
    return '#f44336'
  })

  const ctx = document.getElementById('attackChart')
  if (!ctx) return

  attackChart.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Нет данных'],
      datasets: [{
        label: 'Эффективность атаки (%)',
        data: data.length ? data : [0],
        backgroundColor: colors.length ? colors : ['#999'],
        borderColor: colors.length ? colors : ['#999'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: '%' }
        }
      }
    }
  })
}

function renderPointsChart() {
  if (pointsChart.value) {
    pointsChart.value.destroy()
  }

  const players = allPlayers.value.filter(p => getPlayerPoints(p) > 0)
  const labels = players.map(p => `#${p.number} ${p.name}`)
  const data = players.map(p => getPlayerPoints(p))
  const colors = ['#667eea', '#764ba2', '#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0']

  const ctx = document.getElementById('pointsChart')
  if (!ctx) return

  pointsChart.value = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Нет очков'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: colors.slice(0, data.length || 1),
        borderColor: '#1a1a2e',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#333'
          }
        }
      }
    }
  })
}

function renderReceptionChart() {
  if (receptionChart.value) {
    receptionChart.value.destroy()
  }

  const players = allPlayers.value.filter(p => {
    const r = getPlayerStats(p).receptions
    return r.total > 0
  })

  const labels = players.map(p => `#${p.number} ${p.name}`)
  const data = players.map(p => getPlayerReceptionPercent(p))
  const colors = data.map(v => {
    if (v >= 70) return '#4caf50'
    if (v >= 50) return '#8bc34a'
    if (v >= 30) return '#ff9800'
    return '#f44336'
  })

  const ctx = document.getElementById('receptionChart')
  if (!ctx) return

  receptionChart.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Нет данных'],
      datasets: [{
        label: 'Процент положительного приема (%)',
        data: data.length ? data : [0],
        backgroundColor: colors.length ? colors : ['#999'],
        borderColor: colors.length ? colors : ['#999'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: '%' }
        }
      }
    }
  })
}

watch(() => store.events, () => {
  renderCharts()
}, { deep: true })

watch(() => store.currentRally, () => {
  renderCharts()
}, { deep: true })

watch(() => store.team.currentSet, () => {
  renderCharts()
})

watch(() => store.team.setServing, () => {
  renderCharts()
}, { deep: true })

onMounted(() => {
  renderCharts()
})
</script>

<style scoped>
.statistics {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.empty-state {
  background: #fff3cd;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  color: #856404;
  font-size: 18px;
}

/* === ТАБЛИЦА СТАТИСТИКИ === */
.stats-table-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  margin-bottom: 20px;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 1100px;
}

/* === ВСЯ ШАПКА — белая с черным шрифтом === */
.stats-table thead th {
  background: #ffffff !important;
  color: #000000 !important;
  padding: 8px 6px;
  text-align: center;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border: 1px solid #d0d0d0 !important;
  white-space: nowrap;
}

.stats-table thead th[rowspan="2"] {
  vertical-align: middle;
}

.stats-table thead th[colspan] {
  background: #f5f5f5 !important;
}

/* === ТЕЛО ТАБЛИЦЫ === */
.stats-table tbody td {
  padding: 6px 4px;
  text-align: center;
  border: 1px solid #d0d0d0 !important;
  font-size: 12px;
  vertical-align: middle;
}

.stats-table tbody tr:hover {
  background: #f8f9ff;
}

.stats-table .player-name {
  text-align: left;
  font-weight: 500;
  color: #333;
  padding-left: 10px;
  white-space: nowrap;
  font-size: 13px;
}

/* === ЗАГОЛОВКИ СЕТОВ — все в прямоугольных рамках ===
.set-header {
  font-size: 14px;
  font-weight: 700;
  min-width: 44px;
  width: 44px;
  text-align: center !important;
  vertical-align: middle;
  padding: 6px 2px !important;
  border: 1px solid #d0d0d0 !important;
  background: #ffffff !important;
  color: #000000 !important;
}

 === ОБВОДКА ДЛЯ СЕТА (ПОДАЕМ) — идеальный круг ===
.serving-set {
  background: #ffffff !important;
  color: #000000 !important;
  border: 2px solid #000000 !important;
  border-radius: 40% !important;
  padding: 0 !important;
  width: 30px !important;
  height: 30px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  font-size: 14px;
  font-weight: 700;
  line-height: 1 !important;
  margin: 2px auto !important;
  box-sizing: border-box;
  flex-shrink: 0 !important;
}

=== БЕЗ ОБВОДКИ (ПРИНИМАЕМ) — просто цифра внутри рамки ===
.set-header:not(.serving-set) {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1px solid #d0d0d0 !important;
  font-size: 14px;
  font-weight: 700;
  text-align: center !important;
} */

/* =========================================
   ЗАГОЛОВКИ СЕТОВ
   ========================================= */

.set-header {
  width: 54px;
  min-width: 54px;
  height: 54px;

  padding: 0 !important;

  background: #ffffff !important;
  color: #000000 !important;

  border-top: 2px solid #000000 !important;
  border-bottom: 2px solid #000000 !important;
  border-right: 2px solid #000000 !important;

  text-align: center !important;
  vertical-align: middle;

  font-size: 14px;
  font-weight: 700;

  box-sizing: border-box;
}

/* Левая граница всей таблицы */

.set-header:first-child {
  border-left: 2px solid #000000 !important;
}

/* =========================================
   ОБЫЧНЫЙ СЕТ - Просто цифра
   ========================================= */

.set-header > span:not(.serving-set) {
  display: inline-block;

  font-size: 14px;
  font-weight: 700;

  line-height: 1;
}

/* =========================================
   СЕТ, В КОТОРОМ НАША ПОДАЧА
   ========================================= */

.serving-set {
  display: inline-flex !important;

  width: 38px !important;
  height: 38px !important;

  align-items: center !important;
  justify-content: center !important;

  margin: 0 auto !important;
  padding: 0 !important;

  background: #ffffff !important;
  color: #000000 !important;

  border: 3px solid #ff0000 !important;
  border-radius: 40% !important;

  box-sizing: border-box;

  font-size: 14px;
  font-weight: 700;

  line-height: 1 !important;
}

/* === СТОЛБЕЦ СТАРТОВЫХ ПОЗИЦИЙ === */
.player-zone {
  min-width: 44px;
  width: 44px;
  padding: 4px 2px !important;
  text-align: center !important;
}

.zone-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
}

.zone-number {
  color: #333;
}

.sub-indicator {
  color: #ff9800;
  font-size: 14px;
}

.libero-tag {
  display: inline-block;
  background: #ff9800;
  color: white;
  font-weight: 700;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 20px;
}

/* === СТАТИСТИКА === */
.stats-table .stat-points {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.points-diff {
  font-size: 11px;
  font-weight: 500;
}

.points-diff.positive {
  color: #4caf50;
}

.points-diff.negative {
  color: #f44336;
}

.points-diff.neutral {
  color: #999;
}

.stats-table .stat-serve {
  color: #4caf50;
  font-weight: 500;
}

.stats-table .stat-serve-error {
  color: #f44336;
}

.stats-table .stat-serve-ace {
  color: #2196f3;
  font-weight: 600;
}

.stats-table .stat-reception-percent {
  font-weight: 600;
  color: #667eea;
}

.stats-table .stat-attack {
  color: #ff9800;
}

.stats-table .stat-attack-error {
  color: #f44336;
}

.stats-table .stat-attack-block {
  color: #9c27b0;
}

.stats-table .stat-attack-kill {
  color: #4caf50;
  font-weight: 600;
}

.stats-table .stat-attack-percent {
  font-weight: 600;
  color: #667eea;
}

.stats-table .stat-block {
  color: #f44336;
  font-weight: 600;
}

/* === ИТОГОВАЯ СТРОКА === */
.total-row {
  background: #f5f5f5 !important;
  border-top: 2px solid #667eea;
}

.total-row td {
  padding: 6px 4px;
  font-weight: 600;
  font-size: 13px;
  border: 1px solid #d0d0d0 !important;
}

.total-row .stat-points {
  font-size: 14px;
  color: #667eea;
}

/* === ГРАФИКИ === */
.charts {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.charts h3 {
  margin: 20px 0 15px 0;
  color: #333;
}

.charts h3:first-of-type {
  margin-top: 0;
}

.chart-container {
  height: 280px;
  margin-bottom: 30px;
}

/* === АДАПТИВ === */
@media (max-width: 768px) {
  .stats-table {
    font-size: 10px;
    min-width: 900px;
  }

  .stats-table thead th {
    font-size: 9px;
    padding: 4px 2px;
  }

  .stats-table thead th,
  .stats-table tbody td {
    padding: 3px 2px;
  }

  .stats-table .player-name {
    font-size: 11px;
    padding-left: 4px;
  }

  .zone-cell {
    font-size: 11px;
  }

  .chart-container {
    height: 200px;
  }

  .set-header {
    font-size: 12px;
    min-width: 34px;
    width: 34px;
    padding: 4px 2px !important;
  }

  .serving-set {
    width: 28px !important;
    height: 28px !important;
    font-size: 12px;
    border-width: 2px !important;
    border-radius: 40px !important;
  }

  .player-zone {
    min-width: 34px;
    width: 34px;
  }
}
</style>
