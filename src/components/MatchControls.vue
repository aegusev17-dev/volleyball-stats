<template>
  <div class="match-controls">
    <h3>🎯 Управление матчем</h3>

    <div v-if="!isMatchStarted" class="start-match">
      <h4>Настройка перед матчем</h4>
      <p>Выберите статус для расстановки:</p>
      <div class="choice-buttons">
        <button
          @click="setServingStatus(true)"
          class="choice-btn serve-btn"
          :class="{ active: isServing }"
        >
          ⚡ Подаем
        </button>
        <button
          @click="setServingStatus(false)"
          class="choice-btn receive-btn"
          :class="{ active: !isServing }"
        >
          🛡 Принимаем
        </button>
      </div>

      <div class="status-info">
        <span v-if="isServing" class="serving-text">⚡ Выбрана подача</span>
        <span v-else class="receiving-text">🛡 Выбран прием</span>
      </div>

      <div class="start-section">
        <p>Начните 1-й сет:</p>
        <button @click="startFirstSet" class="start-btn">🚀 Начать 1-й сет</button>
      </div>

      <div v-if="!hasPlayers" class="warning">
        ⚠️ Добавьте игроков и настройте состав!
      </div>
      <div v-if="hasPlayers && !hasLibero" class="warning">
        ⚠️ Назначьте либеро!
      </div>
    </div>

    <div v-else class="match-info">
      <div class="set-info">
        <span>Сет: {{ currentSetNumber }}</span>
        <span class="score">
          {{ teamName }} {{ homeScore }} : {{ awayScore }} Соперник
        </span>
        <span class="status-indicator" :class="isServing ? 'serving' : 'receiving'">
          {{ isServing ? '⚡ Подаем' : '🛡 Принимаем' }}
        </span>
      </div>

      <div class="status-control">
        <span class="label">Сменить статус (коррекция):</span>
        <button
          @click="setServingStatus(true)"
          class="status-btn serve-btn"
          :class="{ active: isServing }"
        >
          ⚡ Подаем
        </button>
        <button
          @click="setServingStatus(false)"
          class="status-btn receive-btn"
          :class="{ active: !isServing }"
        >
          🛡 Принимаем
        </button>
      </div>

      <div class="set-actions">
        <button @click="showNextSetDialog" class="new-set-btn">
          ➕ {{ getNextSetText }}
        </button>
        <div v-if="currentSetNumber === 5 && isFifthSet" class="toss-section">
          <span class="toss-label">🏆 Жребий 5-го сета:</span>
          <button @click="setFifthSetServe(true)" class="toss-btn serve-btn">Мы подаем</button>
          <button @click="setFifthSetServe(false)" class="toss-btn receive-btn">Соперник подает</button>
        </div>
        <button @click="resetMatch" class="reset-btn">🔄 Сбросить матч</button>
      </div>

      <div class="libero-info">
        <span v-if="libero">
          Либеро: #{{ libero.number }} {{ libero.name }}
          <span v-if="isLiberoOnCourt" class="on-court">✅ на площадке</span>
          <span v-else class="off-court">❌ вне площадки</span>
        </span>
        <span v-else class="no-libero">Либеро не назначен</span>
      </div>
    </div>

    <div v-if="showSetDialog" class="modal-overlay">
      <div class="modal">
        <h4>{{ getSetDialogTitle }}</h4>
        <p v-if="currentSetNumber < 5">
          По правилам:
          <strong>{{ isOurServeNext ? 'мы подаем' : 'соперник подает' }}</strong>
        </p>
        <p v-else>В 5-м сете подает команда, выигравшая жребий</p>
        <div class="choice-buttons">
          <button @click="startNextSet" class="choice-btn serve-btn">✅ Начать сет</button>
          <button @click="showSetDialog = false" class="cancel-btn">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMatchStore } from '@/stores/matchStore'

const store = useMatchStore()
const showSetDialog = ref(false)

const isMatchStarted = computed(() => {
  return store.currentRally?.isActive || false
})

const currentSetNumber = computed(() => {
  return store.currentRally?.setNumber || 1
})

const homeScore = computed(() => {
  return store.currentRally?.score?.home || 0
})

const awayScore = computed(() => {
  return store.currentRally?.score?.away || 0
})

const isServing = computed(() => {
  return store.team?.isServing || false
})

const teamName = computed(() => {
  return store.team?.name || 'Моя команда'
})

const libero = computed(() => {
  return store.team?.libero || null
})

const isLiberoOnCourt = computed(() => {
  return store.team?.isLiberoOnCourt || false
})

const hasPlayers = computed(() => {
  return (store.team?.players?.length || 0) > 0
})

const hasLibero = computed(() => {
  return store.team?.libero !== null
})

const isFifthSet = computed(() => {
  return currentSetNumber.value === 5
})

const isOurServeNext = computed(() => {
  const nextSet = currentSetNumber.value + 1
  if (nextSet <= 4) {
    return nextSet % 2 === 1
  }
  return true
})

const getNextSetText = computed(() => {
  const nextSet = currentSetNumber.value + 1
  if (nextSet <= 4) {
    const who = nextSet % 2 === 1 ? 'мы' : 'соперник'
    return `Сет ${nextSet} (подает ${who})`
  }
  return `Сет 5 (жребий)`
})

const getSetDialogTitle = computed(() => {
  const nextSet = currentSetNumber.value + 1
  if (nextSet <= 4) {
    const who = nextSet % 2 === 1 ? 'мы' : 'соперник'
    return `Сет ${nextSet} - подает ${who}`
  }
  return `Сет 5 - жребий`
})

// === Установка статуса ===
function setServingStatus(isServing) {
  store.setServing(isServing)
}

// === НАЧАЛО 1-ГО СЕТА (исправлено) ===
function startFirstSet() {
  if (!hasPlayers.value) {
    alert('Сначала добавьте игроков!')
    return
  }
  if (!hasLibero.value) {
    alert('Сначала назначьте либеро!')
    return
  }

  // === ВАЖНО: передаем ТЕКУЩИЙ статус подачи ===
  const currentStatus = store.team.isServing
  store.startSet(1, currentStatus)
}

function showNextSetDialog() {
  const nextSet = currentSetNumber.value + 1
  if (nextSet > 5) {
    alert('Матч состоит из 5 сетов!')
    return
  }
  showSetDialog.value = true
}

function startNextSet() {
  const nextSet = currentSetNumber.value + 1
  let isOurServe

  if (nextSet <= 4) {
    isOurServe = nextSet % 2 === 1
  } else {
    isOurServe = true
  }

  store.startSet(nextSet, isOurServe)
  showSetDialog.value = false
}

function setFifthSetServe(isOurServe) {
  store.setFifthSetServe(isOurServe)
  store.applyLiberoRules()
}

function resetMatch() {
  if (confirm('Вы уверены, что хотите сбросить матч?')) {
    store.resetMatch()
    showSetDialog.value = false
  }
}
</script>

<style scoped>
.match-controls {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.match-controls h3 {
  margin-bottom: 20px;
  color: #333;
}

.start-match {
  text-align: center;
}

.start-match h4 {
  color: #555;
  margin-bottom: 10px;
}

.start-match p {
  color: #666;
  margin-bottom: 10px;
}

.choice-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.choice-btn {
  padding: 12px 35px;
  border: 3px solid #ddd;
  border-radius: 12px;
  background: white;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 150px;
}

.choice-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.choice-btn.active {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.serve-btn {
  border-color: #4caf50;
  color: #4caf50;
}

.serve-btn:hover,
.serve-btn.active {
  background: #e8f5e9;
}

.receive-btn {
  border-color: #ff9800;
  color: #ff9800;
}

.receive-btn:hover,
.receive-btn.active {
  background: #fff3e0;
}

.status-info {
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 500;
}

.serving-text {
  color: #4caf50;
}

.receiving-text {
  color: #ff9800;
}

.start-section {
  margin-top: 10px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.start-btn {
  padding: 15px 50px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
}

.start-btn:hover {
  background: #388e3c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.match-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.set-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 10px;
}

.score {
  font-size: 24px;
  font-weight: bold;
}

.status-indicator {
  font-size: 16px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

.status-indicator.serving {
  background: #e8f5e9;
  color: #4caf50;
}

.status-indicator.receiving {
  background: #fff3e0;
  color: #ff9800;
}

.status-control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
}

.status-control .label {
  font-size: 14px;
  color: #666;
  margin-right: 10px;
}

.status-btn {
  padding: 8px 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.status-btn.serve-btn {
  border-color: #4caf50;
  color: #4caf50;
}

.status-btn.serve-btn.active {
  background: #4caf50;
  color: white;
}

.status-btn.receive-btn {
  border-color: #ff9800;
  color: #ff9800;
}

.status-btn.receive-btn.active {
  background: #ff9800;
  color: white;
}

.set-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.new-set-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  width: 100%;
}

.new-set-btn:hover {
  background: #5a67d8;
}

.toss-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fff8e1;
  border-radius: 8px;
  flex-wrap: wrap;
}

.toss-label {
  font-weight: 600;
  color: #e65100;
}

.toss-btn {
  padding: 8px 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.reset-btn {
  padding: 10px 20px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  width: 100%;
}

.reset-btn:hover {
  background: #d32f2f;
}

.libero-info {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.on-court {
  color: #4caf50;
  font-weight: 500;
}

.off-court {
  color: #999;
}

.no-libero {
  color: #f44336;
}

.warning {
  margin-top: 15px;
  padding: 15px;
  background: #fff3cd;
  border-radius: 8px;
  color: #856404;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 16px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal h4 {
  margin-bottom: 10px;
  color: #333;
}

.modal p {
  color: #666;
  margin-bottom: 20px;
}

.cancel-btn {
  margin-top: 10px;
  padding: 10px 30px;
  background: #e0e0e0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #333;
}

.cancel-btn:hover {
  background: #d5d5d5;
}

@media (max-width: 480px) {
  .choice-btn {
    padding: 12px 24px;
    font-size: 16px;
    min-width: 120px;
  }

  .set-info {
    flex-direction: column;
    text-align: center;
  }
}
</style>
