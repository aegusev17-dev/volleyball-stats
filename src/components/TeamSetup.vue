<template>
  <div class="team-setup">
    <div class="header-actions">
      <h2>📋 Управление игроками</h2>
      <button @click="loadTestPlayers" class="load-test-btn">🎲 Загрузить тестовых игроков</button>
    </div>

    <div class="team-config">
      <h3>
        <input
          v-model="store.team.name"
          class="team-name-input"
          placeholder="Название команды"
        />
      </h3>

      <div class="opponent-row">
        <span class="opponent-label">Соперник:</span>
        <input
          v-model="store.team.opponentName"
          class="opponent-name-input"
          placeholder="Название команды соперника"
          maxlength="60"
        />
      </div>

      <div class="input-group">
        <input v-model="newPlayerName" placeholder="Имя игрока" />
        <input v-model.number="newPlayerNumber" type="number" placeholder="Номер" />
        <select v-model="newPlayerPosition">
          <option value="">Основное амплуа</option>
          <option v-for="(name, key) in store.POSITIONS" :key="key" :value="key">
            {{ name }}
          </option>
        </select>
        <select v-model="newAlternativePosition">
          <option value="">Альтернативное амплуа</option>
          <option v-for="(name, key) in store.POSITIONS" :key="key" :value="key">
            {{ name }}
          </option>
        </select>
        <button @click="addPlayerToTeam">➕ Добавить</button>
      </div>

      <div class="player-list">
        <div v-for="p in store.team.players" :key="p.id" class="player-item">
          <span>
            #{{ p.number }} {{ p.name }}
            <span class="position-tag primary">{{ p.positionName || 'без амплуа' }}</span>
            <span v-if="p.alternativePositionName" class="position-tag alternative">
              → {{ p.alternativePositionName }}
            </span>
          </span>
          <button @click="removePlayer(p.id)" class="remove-btn">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMatchStore } from '@/stores/matchStore'

const store = useMatchStore()
const newPlayerName = ref('')
const newPlayerNumber = ref(1)
const newPlayerPosition = ref('')
const newAlternativePosition = ref('')

// === ТЕСТОВЫЕ ИГРОКИ С АЛЬТЕРНАТИВНЫМИ АМПЛУА ===
const testPlayers = [
  // Основные игроки
  { name: 'Кедров Дмитрий', number: 3, position: 'OH', altPosition: 'OPP' },
  { name: 'Кокорев Алексей', number: 5, position: 'OH', altPosition: 'OPP' },
  { name: 'Грошев Александр', number: 12, position: 'OH', altPosition: 'L' },
  { name: 'Гусев Андрей', number: 1, position: 'OH', altPosition: 'MB' },
  { name: 'Кедров Вячеслав', number: 2, position: 'MB', altPosition: 'OH' },
  { name: 'Трощинин Борис', number: 9, position: 'MB', altPosition: null },
  { name: 'Кузнецов Даниил', number: 6, position: 'MB', altPosition: null },
  { name: 'Пикоткин Дмитрий', number: 8, position: 'OPP', altPosition: 'OH' },
  { name: 'Мушников Кирилл', number: 7, position: 'S', altPosition: null },
  { name: 'Фарахов Денис', number: 10, position: 'S', altPosition: 'OPP' },
  { name: 'Ковалев Александр', number: 4, position: 'L', altPosition: null },
  { name: 'Попов Александр', number: 11, position: 'L', altPosition: 'OH' },
]

// === Загрузка тестовых игроков ===
function loadTestPlayers() {
  if (confirm('Загрузить тестовых игроков? Это удалит всех текущих игроков.')) {
    store.team.players = []
    testPlayers.forEach(p => {
      store.addPlayer(p.name, p.number, p.position, p.altPosition)
    })
    store.team.name = 'НПФ МЕТРОЛОГИЯ (Одержимые)'
    autoFillLineup()
  }
}

// === Авторасстановка ===
function autoFillLineup() {
  const players = store.team.players
  if (players.length === 0) return

  const oh = players.filter(p => p.position === 'OH')
  const mb = players.filter(p => p.position === 'MB')
  const opp = players.filter(p => p.position === 'OPP')
  const s = players.filter(p => p.position === 'S')

  oh.sort((a, b) => a.number - b.number)
  mb.sort((a, b) => a.number - b.number)

  const lineup = Array(6).fill(null)

  // Стандартная расстановка
  lineup[3] = mb.length > 0 ? mb[0] : null  // зона 4: ЦБ1
  lineup[2] = oh.length > 0 ? oh[0] : null  // зона 3: ДО1
  lineup[1] = s.length > 0 ? s[0] : null    // зона 2: СВ
  lineup[4] = opp.length > 0 ? opp[0] : null // зона 5: ДИ
  lineup[5] = oh.length > 1 ? oh[1] : (oh.length > 0 ? oh[0] : null) // зона 6: ДО2
  lineup[0] = mb.length > 1 ? mb[1] : (mb.length > 0 ? mb[0] : null) // зона 1: ЦБ2

  // Проверяем дубли
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

  store.setLineup(lineup.filter(p => p))

  // Назначаем либеро
  const l = players.find(p => p.position === 'L')
  if (l) {
    store.setLibero(l.id)
  }
}

// === Добавление игрока с альтернативным амплуа ===
function addPlayerToTeam() {
  if (newPlayerName.value && newPlayerNumber.value) {
    store.addPlayer(
      newPlayerName.value,
      newPlayerNumber.value,
      newPlayerPosition.value,
      newAlternativePosition.value
    )
    newPlayerName.value = ''
    newPlayerNumber.value = 1
    newPlayerPosition.value = ''
    newAlternativePosition.value = ''
  }
}

// === Удаление игрока ===
function removePlayer(id) {
  const index = store.team.players.findIndex(p => p.id === id)
  if (index !== -1) {
    store.team.players.splice(index, 1)
  }
}
</script>

<style scoped>
.team-setup {
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

.header-actions h2 {
  margin: 0;
}

.load-test-btn {
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

.load-test-btn:hover {
  background: #f57c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.team-config {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.team-name-input {
  font-size: 24px;
  font-weight: bold;
  border: none;
  border-bottom: 2px solid #667eea;
  padding: 5px 10px;
  width: 100%;
  background: transparent;
  transition: border-color 0.3s;
}

.opponent-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0 0;
}

.opponent-label {
  color: #666;
  font-weight: 600;
  white-space: nowrap;
}

.opponent-name-input {
  flex: 1;
  font-size: 18px;
  border: none;
  border-bottom: 2px solid #e53935;
  padding: 4px 10px;
  background: transparent;
}

.opponent-name-input:focus {
  outline: none;
  border-bottom-color: #b71c1c;
}

.team-name-input:focus {
  outline: none;
  border-bottom-color: #764ba2;
}

.team-name-input::placeholder {
  color: #aaa;
  font-weight: normal;
}

.input-group {
  display: flex;
  gap: 10px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.input-group input,
.input-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  min-width: 80px;
}

.input-group button {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.input-group button:hover {
  background: #5a67d8;
}

.player-list {
  margin-top: 15px;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  margin: 4px 0;
  border-radius: 4px;
  transition: background 0.2s;
}

.player-item:hover {
  background: #e8ecf1;
}

.position-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  margin-left: 6px;
  color: white;
}

.position-tag.primary {
  background: #667eea;
}

.position-tag.alternative {
  background: #ff9800;
}

.remove-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.remove-btn:hover {
  background: #d32f2f;
}
</style>
