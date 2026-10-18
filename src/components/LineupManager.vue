<template>
  <div class="lineup-manager">
    <div class="header-actions">
      <h3>📋 Управление составом</h3>
      <button @click="autoFillLineup" class="auto-fill-btn">⚡ Авторасстановка</button>
      <button @click="reloadLineup" class="reload-btn">🔄 Обновить</button>
    </div>

    <div class="team-lineup">
      <h4>{{ store.team.name }}</h4>

      <div class="set-info">
        <span>Сет: {{ store.team.currentSet }}</span>
        <button @click="store.changeSet(store.team.currentSet + 1)" class="set-btn">
          ➕ Сет {{ store.team.currentSet + 1 }}
        </button>
      </div>

      <div class="add-player">
        <input v-model="newPlayerName" placeholder="Имя игрока" />
        <input v-model.number="newPlayerNumber" type="number" placeholder="Номер" />
        <select v-model="newPlayerPosition">
          <option value="">Амплуа</option>
          <option v-for="(name, key) in store.POSITIONS" :key="key" :value="key">
            {{ name }}
          </option>
        </select>
        <button @click="addPlayerToTeam">➕ Добавить</button>
      </div>

      <!-- Расстановка по зонам -->
      <div class="lineup-section">
        <h5>Расстановка по зонам</h5>
        <div class="court-preview">
          <div class="court-grid">
            <div class="row-label">Передняя линия</div>

            <div class="zone-slot">
              <span class="zone-label">Зона 4</span>
              <span class="zone-position">Левая передняя</span>
              <select v-model="selectedPlayers[3]" @change="updateLineup">
                <option :value="null">— Выбрать —</option>
                <option
                  v-for="player in getAvailablePlayersForZone(3)"
                  :key="player.id"
                  :value="player.id"
                >
                  #{{ player.number }} {{ player.name }} ({{ player.positionName || 'без амплуа' }})
                </option>
              </select>
            </div>

            <div class="zone-slot">
              <span class="zone-label">Зона 3</span>
              <span class="zone-position">Центр передняя</span>
              <select v-model="selectedPlayers[2]" @change="updateLineup">
                <option :value="null">— Выбрать —</option>
                <option
                  v-for="player in getAvailablePlayersForZone(2)"
                  :key="player.id"
                  :value="player.id"
                >
                  #{{ player.number }} {{ player.name }} ({{ player.positionName || 'без амплуа' }})
                </option>
              </select>
            </div>

            <div class="zone-slot">
              <span class="zone-label">Зона 2</span>
              <span class="zone-position">Правая передняя</span>
              <select v-model="selectedPlayers[1]" @change="updateLineup">
                <option :value="null">— Выбрать —</option>
                <option
                  v-for="player in getAvailablePlayersForZone(1)"
                  :key="player.id"
                  :value="player.id"
                >
                  #{{ player.number }} {{ player.name }} ({{ player.positionName || 'без амплуа' }})
                </option>
              </select>
            </div>

            <div class="net-divider">━━━━ СЕТКА ━━━━</div>

            <div class="row-label">Задняя линия</div>

            <div class="zone-slot">
              <span class="zone-label">Зона 5</span>
              <span class="zone-position">Левая задняя</span>
              <select v-model="selectedPlayers[4]" @change="updateLineup">
                <option :value="null">— Выбрать —</option>
                <option
                  v-for="player in getAvailablePlayersForZone(4)"
                  :key="player.id"
                  :value="player.id"
                >
                  #{{ player.number }} {{ player.name }} ({{ player.positionName || 'без амплуа' }})
                </option>
              </select>
            </div>

            <div class="zone-slot">
              <span class="zone-label">Зона 6</span>
              <span class="zone-position">Центр задняя</span>
              <select v-model="selectedPlayers[5]" @change="updateLineup">
                <option :value="null">— Выбрать —</option>
                <option
                  v-for="player in getAvailablePlayersForZone(5)"
                  :key="player.id"
                  :value="player.id"
                >
                  #{{ player.number }} {{ player.name }} ({{ player.positionName || 'без амплуа' }})
                </option>
              </select>
            </div>

            <div class="zone-slot">
              <span class="zone-label">Зона 1</span>
              <span class="zone-position">Правая задняя (подача)</span>
              <select v-model="selectedPlayers[0]" @change="updateLineup">
                <option :value="null">— Выбрать —</option>
                <option
                  v-for="player in getAvailablePlayersForZone(0)"
                  :key="player.id"
                  :value="player.id"
                >
                  #{{ player.number }} {{ player.name }} ({{ player.positionName || 'без амплуа' }})
                </option>
              </select>
            </div>
          </div>
        </div>
        <button @click="applyLineup" class="apply-btn">✅ Применить состав</button>
      </div>

      <!-- Либеро -->
      <div class="libero-section">
        <h5>Либеро</h5>
        <select v-model="selectedLibero">
          <option :value="null">— Не выбран —</option>
          <option v-for="player in store.team.players" :key="player.id" :value="player.id">
            #{{ player.number }} {{ player.name }} ({{ player.positionName || 'без амплуа' }})
          </option>
        </select>
        <button @click="setLibero" class="set-btn">Назначить либеро</button>
        <button @click="keepMB" class="keep-mb-btn" title="Оставить ЦБ на площадке">
          ⛔ Не заменять ЦБ
        </button>

        <div class="libero-controls">
          <button @click="doLiberoIn" class="libero-in-btn">⬆ Либеро входит</button>
          <button @click="doLiberoOut" class="libero-out-btn">⬇ Либеро выходит</button>
        </div>

        <div v-if="store.team.libero" class="libero-status">
          <span v-if="store.team.isLiberoOnCourt" class="on-court">✅ Либеро на площадке</span>
          <span v-else class="off-court">❌ Либеро вне площадки</span>
        </div>
      </div>

      <!-- Текущий состав на площадке -->
      <div class="current-rotation" :key="rotationKey">
        <h5>На площадке:</h5>
        <div class="court-preview-mini">
          <div class="court-grid-mini">
            <div class="mini-row-label">Передняя линия</div>
            <div v-for="zone in [4, 3, 2]" :key="zone" class="mini-zone">
              <span class="mini-zone-label">{{ zone }}</span>
              <span v-if="getPlayerInZone(zone)" class="mini-player" :class="{ 'libero-player': isLibero(getPlayerInZone(zone)) }">
                #{{ getPlayerInZone(zone).number }} {{ getPlayerInZone(zone).name }}
                <span v-if="isLibero(getPlayerInZone(zone))" class="mini-badge">L</span>
              </span>
              <span v-else class="mini-empty">—</span>
            </div>

            <div class="mini-net">━━━━ СЕТКА ━━━━</div>

            <div class="mini-row-label">Задняя линия</div>
            <div v-for="zone in [5, 6, 1]" :key="zone" class="mini-zone">
              <span class="mini-zone-label">{{ zone }}</span>
              <span v-if="getPlayerInZone(zone)" class="mini-player" :class="{ 'libero-player': isLibero(getPlayerInZone(zone)) }">
                #{{ getPlayerInZone(zone).number }} {{ getPlayerInZone(zone).name }}
                <span v-if="isLibero(getPlayerInZone(zone))" class="mini-badge">L</span>
              </span>
              <span v-else class="mini-empty">—</span>
            </div>
          </div>
        </div>
        <div class="rotation-status">
          <span v-if="store.team.isServing" class="serving-text">⚡ Подаем</span>
          <span v-else class="receiving-text">🛡 Принимаем</span>
        </div>
      </div>

      <!-- Замены -->
      <div class="substitutions">
        <h5>Замены</h5>
        <div class="sub-buttons">
          <select v-model="subIn">
            <option :value="null">Входит</option>
            <option
              v-for="p in availableSubstitutes"
              :key="p.id"
              :value="p.id"
            >
              #{{ p.number }} {{ p.name }} ({{ p.positionName }})
            </option>
          </select>
          <select v-model="subOut">
            <option :value="null">Выходит</option>
            <option
              v-for="p in availableOutPlayers"
              :key="p.id"
              :value="p.id"
            >
              #{{ p.number }} {{ p.name }} ({{ p.positionName }})
              <span v-if="p.id === store.team.libero?.id" class="libero-tag">L</span>
            </option>
          </select>
          <button @click="doSubstitution" class="sub-btn">🔄 Замена</button>
        </div>
      </div>

      <div class="timeout-section">
        <button @click="store.callTimeout()" class="timeout-btn">
          ⏸ Тайм-аут ({{ store.team.timeouts }}/2)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { useMatchStore } from '@/stores/matchStore'

const store = useMatchStore()

const newPlayerName = ref('')
const newPlayerNumber = ref(1)
const newPlayerPosition = ref('')

const selectedPlayers = ref(Array(6).fill(null))
const selectedLibero = ref(null)
const subIn = ref(null)
const subOut = ref(null)

const rotationKey = ref(0)

// === ПОЛУЧИТЬ ДОСТУПНЫХ ИГРОКОВ ДЛЯ ЗОНЫ ===
function getAvailablePlayersForZone(currentZoneIndex) {
  const allPlayers = store.team.players || []
  if (allPlayers.length < 6) {
    return []
  }

  const selectedIds = new Set()
  selectedPlayers.value.forEach((id, index) => {
    if (index !== currentZoneIndex && id !== null) {
      selectedIds.add(id)
    }
  })

  return allPlayers.filter(p => !selectedIds.has(p.id))
}

// === ИГРОКИ, ДОСТУПНЫЕ ДЛЯ ЗАМЕНЫ ===
const availableSubstitutes = computed(() => {
  const rotation = store.team.currentRotation || []
  const rotationIds = new Set(rotation.filter(p => p !== null).map(p => p.id))
  const liberoId = store.team.libero?.id
  return store.team.players.filter(p =>
    !rotationIds.has(p.id) && p.id !== liberoId
  )
})

const availableOutPlayers = computed(() => {
  const rotation = store.team.currentRotation || []
  const players = rotation.filter(p => p !== null && p !== undefined)

  if (store.team.isLiberoOnCourt && store.team.libero) {
    const libero = store.team.libero
    if (!players.some(p => p && p.id === libero.id)) {
      players.push(libero)
    }
  }

  return players.sort((a, b) => {
    if (a.id === store.team.libero?.id) return 1
    if (b.id === store.team.libero?.id) return -1
    return 0
  })
})

// === Получить игрока в зоне ===
function getPlayerInZone(zone) {
  const rotation = store.team?.currentRotation || []
  const index = zone - 1
  if (index >= 0 && index < rotation.length) {
    return rotation[index]
  }
  return null
}

// === Проверка на либеро ===
function isLibero(player) {
  if (!player) return false
  const libero = store.team?.libero
  return libero && player.id === libero.id
}

// === АВТОРАССТАНОВКА ===
function autoFillLineup() {
  const players = store.team.players
  if (players.length === 0) {
    alert('Нет игроков для расстановки!')
    return
  }

  if (players.length < 6) {
    alert(`Недостаточно игроков для полной расстановки! (нужно 6, есть ${players.length})`)
    return
  }

  const oh = players.filter(p => p.position === 'OH')
  const mb = players.filter(p => p.position === 'MB')
  const opp = players.filter(p => p.position === 'OPP')
  const s = players.filter(p => p.position === 'S')
  const l = players.filter(p => p.position === 'L')

  oh.sort((a, b) => a.number - b.number)
  mb.sort((a, b) => a.number - b.number)

  const lineup = Array(6).fill(null)

  lineup[3] = mb.length > 0 ? mb[0] : null
  lineup[2] = oh.length > 0 ? oh[0] : null
  lineup[1] = s.length > 0 ? s[0] : null
  lineup[4] = opp.length > 0 ? opp[0] : null
  lineup[5] = oh.length > 1 ? oh[1] : (oh.length > 0 ? oh[0] : null)
  lineup[0] = mb.length > 1 ? mb[1] : (mb.length > 0 ? mb[0] : null)

  const usedIds = new Set()
  lineup.forEach((p, idx) => {
    if (p && usedIds.has(p.id)) {
      const available = players.find(p2 => !usedIds.has(p2.id))
      if (available) {
        lineup[idx] = available
        usedIds.add(available.id)
      } else {
        lineup[idx] = null
      }
    } else if (p) {
      usedIds.add(p.id)
    }
  })

  const remaining = players.filter(p => !usedIds.has(p.id))
  lineup.forEach((p, idx) => {
    if (!p && remaining.length > 0) {
      lineup[idx] = remaining.shift()
    }
  })

  const hasEmptyZone = lineup.some(p => p === null)
  if (hasEmptyZone) {
    alert(`Не удалось заполнить все зоны! Свободных игроков: ${remaining.length}`)
    return
  }

  selectedPlayers.value = lineup.map(p => p ? p.id : null)
  store.setLineup(lineup)

  // === НАЗНАЧАЕМ ЛИБЕРО ===
  const hasValidLibero = store.team.libero && store.team.libero.position === 'L'

  if (!hasValidLibero) {
    const libero = l.length > 0 ? l[0] : null
    if (libero && libero.position === 'L') {
      store.setLibero(libero.id)
      selectedLibero.value = libero.id
    } else {
      store.team.libero = null
      selectedLibero.value = null
    }
  } else {
    selectedLibero.value = store.team.libero.id
  }

  forceUpdate()
}

// === ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАГРУЗКА СОСТАВА ===
function reloadLineup() {
  const lineup = store.team.lineup
  if (lineup && lineup.length >= 6) {
    selectedPlayers.value = lineup.map(p => p ? p.id : null)
    while (selectedPlayers.value.length < 6) {
      selectedPlayers.value.push(null)
    }
    if (store.team.libero) {
      selectedLibero.value = store.team.libero.id
    }
    rotationKey.value++
    loadLineup()
    showNotification('🔄 Состав обновлен!', 'info')
  } else {
    alert('Нет сохраненного состава для загрузки или недостаточно игроков!')
  }
}

function getZonePosition(zone) {
  const positions = {
    1: 'Правая задняя (подача)',
    2: 'Правая передняя',
    3: 'Центр передняя',
    4: 'Левая передняя',
    5: 'Левая задняя',
    6: 'Центр задняя'
  }
  return positions[zone] || ''
}

function addPlayerToTeam() {
  if (newPlayerName.value && newPlayerNumber.value) {
    store.addPlayer(newPlayerName.value, newPlayerNumber.value, newPlayerPosition.value)
    newPlayerName.value = ''
    newPlayerNumber.value = 1
    newPlayerPosition.value = ''
    forceUpdate()
  }
}

function updateLineup() {}

function applyLineup() {
  const playerIds = selectedPlayers.value.filter(id => id !== null)
  const players = playerIds.map(id =>
    store.team.players.find(p => p.id === id)
  ).filter(p => p)

  if (players.length >= 6) {
    store.setLineup(players)
    forceUpdate()
  } else {
    alert('Выберите 6 игроков для состава!')
  }
}

function setLibero() {
  if (selectedLibero.value) {
    const player = store.team.players.find(p => p.id === selectedLibero.value)
    if (player && player.position === 'L') {
      store.setLibero(selectedLibero.value)
      forceUpdate()
    } else {
      alert('Либеро должен иметь основное амплуа "Либеро"!')
    }
  }
}

function keepMB() {
  store.keepMB()
  forceUpdate()
}

function doLiberoIn() {
  const rotation = store.team.currentRotation
  const mbOnCourt = rotation.find(p => p && p.position === 'MB')
  if (mbOnCourt) {
    store.liberoIn(mbOnCourt.id)
    forceUpdate()
  } else {
    alert('Нет ЦБ на площадке для замены!')
  }
}

function doLiberoOut() {
  if (store.team.isLiberoOnCourt) {
    store.liberoOut()
    forceUpdate()
  } else {
    alert('Либеро не на площадке!')
  }
}

function doSubstitution() {
  if (subIn.value && subOut.value) {
    store.substitute(subIn.value, subOut.value)
    subIn.value = null
    subOut.value = null
    forceUpdate()
  }
}

function loadLineup() {
  const lineup = store.team.lineup
  if (lineup && lineup.length) {
    selectedPlayers.value = lineup.map(p => p ? p.id : null)
    while (selectedPlayers.value.length < 6) {
      selectedPlayers.value.push(null)
    }
  } else {
    selectedPlayers.value = Array(6).fill(null)
  }

  if (store.team.libero) {
    selectedLibero.value = store.team.libero.id
  } else {
    selectedLibero.value = null
  }
}

function forceUpdate() {
  nextTick(() => {
    rotationKey.value++
    loadLineup()
  })
}

// Уведомления (для кнопки "Обновить")
let notificationTimeout = null

function showNotification(message, type = 'info') {
  // Просто выводим в консоль, если нет системы уведомлений
  console.log(`[${type}] ${message}`)
  alert(message)
}

watch(() => store.team.currentRotation, () => {
  forceUpdate()
}, { deep: true })

watch(() => store.team.isServing, () => {
  forceUpdate()
})

watch(() => store.team.isLiberoOnCourt, () => {
  forceUpdate()
})

watch(() => store.team.libero, () => {
  forceUpdate()
}, { deep: true })

onMounted(() => {
  loadLineup()
})

loadLineup()
</script>

<style scoped>
/* === Стили === */
.lineup-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.header-actions h3 {
  margin: 0;
}

.auto-fill-btn {
  padding: 10px 24px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
}

.auto-fill-btn:hover {
  background: #388e3c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.reload-btn {
  padding: 10px 24px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
}

.reload-btn:hover {
  background: #f57c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.team-lineup {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.team-lineup h4 {
  font-size: 22px;
  color: #333;
  margin-bottom: 15px;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

h5 {
  margin: 15px 0 10px 0;
  color: #555;
}

.set-info {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}

.add-player {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.add-player input, .add-player select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  min-width: 80px;
}

.court-preview {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  margin: 10px 0;
}

.court-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
}

.row-label {
  grid-column: 1 / -1;
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  text-align: center;
  padding: 4px 0;
}

.net-divider {
  grid-column: 1 / -1;
  text-align: center;
  color: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  letter-spacing: 2px;
  padding: 4px 0;
  border-top: 2px dashed rgba(255, 255, 255, 0.1);
  border-bottom: 2px dashed rgba(255, 255, 255, 0.1);
}

.zone-slot {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.zone-slot select {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 12px;
  width: 100%;
}

.zone-slot select:focus {
  outline: none;
  border-color: #667eea;
}

.zone-slot select option {
  background: #2d2d44;
  color: white;
}

.zone-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.zone-position {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}

.libero-section {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 15px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}

.libero-section select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  min-width: 150px;
}

.set-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.keep-mb-btn {
  padding: 8px 16px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.keep-mb-btn:hover {
  background: #f57c00;
}

.libero-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.libero-in-btn {
  padding: 6px 14px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.libero-out-btn {
  padding: 6px 14px;
  background: #ff5722;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.libero-in-btn:hover {
  background: #388e3c;
}

.libero-out-btn:hover {
  background: #d84315;
}

.libero-status {
  padding: 8px;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
  flex: 1;
  min-width: 150px;
}

.on-court {
  color: #4caf50;
}

.off-court {
  color: #999;
}

.court-preview-mini {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 15px;
  margin: 10px 0;
}

.court-grid-mini {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  align-items: center;
}

.mini-row-label {
  grid-column: 1 / -1;
  color: rgba(255, 255, 255, 0.2);
  font-size: 10px;
  text-align: center;
  padding: 2px 0;
}

.mini-net {
  grid-column: 1 / -1;
  text-align: center;
  color: rgba(255, 255, 255, 0.15);
  font-size: 10px;
  letter-spacing: 2px;
  padding: 2px 0;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}

.mini-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  min-height: 40px;
  justify-content: center;
}

.mini-zone-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
  font-weight: bold;
}

.mini-player {
  font-size: 11px;
  color: white;
  text-align: center;
  line-height: 1.2;
}

.mini-player.libero-player {
  color: #ff9800;
}

.mini-badge {
  background: #ff9800;
  color: white;
  border-radius: 50%;
  padding: 0 4px;
  font-size: 8px;
  margin-left: 2px;
}

.mini-empty {
  color: rgba(255, 255, 255, 0.1);
  font-size: 14px;
}

.rotation-status {
  text-align: center;
  padding: 6px;
  font-weight: 600;
  font-size: 14px;
}

.serving-text {
  color: #4caf50;
}

.receiving-text {
  color: #ff9800;
}

.substitutions {
  margin: 15px 0;
}

.sub-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.sub-buttons select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  min-width: 120px;
}

.sub-btn {
  padding: 8px 16px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.libero-tag {
  background: #e65100;
  color: white;
  border-radius: 50%;
  padding: 0 6px;
  font-size: 10px;
  margin-left: 4px;
}

.timeout-section {
  margin-top: 15px;
}

.timeout-btn {
  padding: 10px 20px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  font-weight: 500;
}

.apply-btn {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  font-weight: 500;
}

@media (max-width: 600px) {
  .court-grid, .court-grid-mini {
    gap: 4px;
  }

  .zone-slot {
    padding: 6px;
  }

  .mini-zone {
    min-height: 30px;
    padding: 4px;
  }

  .mini-player {
    font-size: 9px;
  }
}
</style>
