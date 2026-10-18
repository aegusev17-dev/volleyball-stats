<template>
  <div class="scoreboard">
    <div class="score-header">
      <div class="team-score">
        <strong>{{ store.team.name }}</strong>
        <span>{{ store.currentRally.score.home }}</span>
      </div>
      <div class="set-info">Сет {{ store.currentRally.setNumber }}</div>
      <div class="team-score opponent">
        <span>{{ store.currentRally.score.away }}</span>
        <strong>Соперник</strong>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-container">
        <span class="status-label">Статус:</span>
        <span class="status" :class="store.team.isServing ? 'serving' : 'receiving'">
          {{ store.team.isServing ? '⚡ Подаем' : '🛡 Принимаем' }}
        </span>
        <button @click="toggleServing" class="toggle-status-btn">⇄</button>
        <span class="rally-counter">Розыгрыш #{{ rallyCounter + 1 }}</span>
      </div>
    </div>

    <div class="actions-panel" v-if="allPlayers.length > 0">
      <div class="action-group">
        <h4>1. Действие</h4>
        <div class="btn-group">
          <button
            v-for="action in availableActions"
            :key="action"
            @click="selectedAction = action"
            :class="{ active: selectedAction === action }"
          >
            {{ getActionLabel(action) }}
          </button>
        </div>
        <div v-if="availableActions.length === 0" class="waiting-message">
          ⏳ Ожидание завершения предыдущего действия...
        </div>
      </div>

      <div class="players-group" v-if="selectedAction">
        <h4>2. {{ isBlockAction ? 'Выберите вариант блока' : 'Игрок' }}</h4>

        <div v-if="isBlockAction" class="block-options">
          <div class="block-section">
            <div class="block-section-label">👤 Одиночный блок</div>
            <div class="block-players-row">
              <button
                v-for="player in availableBlockPlayers"
                :key="player.id"
                @click="selectBlockPlayers('single', [player])"
                class="block-player-btn single"
                :class="{
                  'zone-2': getPlayerZone(player) === 2,
                  'zone-3': getPlayerZone(player) === 3,
                  'zone-4': getPlayerZone(player) === 4
                }"
              >
                <span class="player-number">#{{ player.number }}</span>
                <span class="player-name">{{ player.name }}</span>
                <span class="position-tag" :class="getPositionClass(player)">{{ getPositionLabel(player) }}</span>
                <span class="zone-tag">зона {{ getPlayerZone(player) }}</span>
              </button>
            </div>
          </div>

          <div class="block-section">
            <div class="block-section-label">👥 Двойной блок</div>
            <div class="block-double-grid">
              <button
                @click="selectBlockPlayers('double', getPlayersInZones([2, 3]))"
                class="block-double-btn zone-2-3"
                :disabled="!areZonesAvailable([2, 3])"
              >
                <div class="block-double-players">
                  <span v-if="areZonesAvailable([2, 3])">
                    <span v-for="(p, idx) in getPlayersInZones([2, 3])" :key="p.id" class="block-double-player">
                      <span class="player-number">#{{ p.number }}</span>
                      <span class="player-name">{{ p.name }}</span>
                      <span class="position-tag" :class="getPositionClass(p)">{{ getPositionLabel(p) }}</span>
                    </span>
                  </span>
                  <span v-else class="unavailable">⚠️ Игроки не в зонах</span>
                </div>
                <div class="block-double-zones">зоны 2-3</div>
              </button>

              <button
                @click="selectBlockPlayers('double', getPlayersInZones([2, 4]))"
                class="block-double-btn zone-2-4"
                :disabled="!areZonesAvailable([2, 4])"
              >
                <div class="block-double-players">
                  <span v-if="areZonesAvailable([2, 4])">
                    <span v-for="(p, idx) in getPlayersInZones([2, 4])" :key="p.id" class="block-double-player">
                      <span class="player-number">#{{ p.number }}</span>
                      <span class="player-name">{{ p.name }}</span>
                      <span class="position-tag" :class="getPositionClass(p)">{{ getPositionLabel(p) }}</span>
                    </span>
                  </span>
                  <span v-else class="unavailable">⚠️ Игроки не в зонах</span>
                </div>
                <div class="block-double-zones">зоны 2-4</div>
              </button>

              <button
                @click="selectBlockPlayers('double', getPlayersInZones([3, 4]))"
                class="block-double-btn zone-3-4"
                :disabled="!areZonesAvailable([3, 4])"
              >
                <div class="block-double-players">
                  <span v-if="areZonesAvailable([3, 4])">
                    <span v-for="(p, idx) in getPlayersInZones([3, 4])" :key="p.id" class="block-double-player">
                      <span class="player-number">#{{ p.number }}</span>
                      <span class="player-name">{{ p.name }}</span>
                      <span class="position-tag" :class="getPositionClass(p)">{{ getPositionLabel(p) }}</span>
                    </span>
                  </span>
                  <span v-else class="unavailable">⚠️ Игроки не в зонах</span>
                </div>
                <div class="block-double-zones">зоны 3-4</div>
              </button>
            </div>
          </div>

          <div class="block-section">
            <div class="block-section-label">👥👥 Тройной блок</div>
            <button
              @click="selectBlockPlayers('triple', getPlayersInZones([2, 3, 4]))"
              class="block-triple-btn"
              :disabled="!areZonesAvailable([2, 3, 4])"
            >
              <span v-if="areZonesAvailable([2, 3, 4])">
                <span v-for="(p, idx) in getPlayersInZones([2, 3, 4])" :key="p.id" class="block-triple-player">
                  <span class="player-number">#{{ p.number }}</span>
                  <span class="player-name">{{ p.name }}</span>
                  <span class="position-tag" :class="getPositionClass(p)">{{ getPositionLabel(p) }}</span>
                </span>
              </span>
              <span v-else class="unavailable">⚠️ Не все игроки в зонах</span>
              <span class="block-triple-zones">зоны 2-3-4</span>
            </button>
          </div>
        </div>

        <div v-if="selectedBlockPlayers.length > 0 && isBlockAction" class="block-result-section">
          <h4>3. Результат блока</h4>
          <div class="btn-group">
            <button @click="executeBlock('kill')" class="result-btn success">🟢 Очко</button>
            <button @click="executeBlock('error')" class="result-btn error">🔴 Ошибка</button>
            <button @click="executeBlock('continue')" class="result-btn neutral">🟡 Защита (мяч в игре)</button>
          </div>
        </div>

        <div v-else-if="!isBlockAction" class="btn-group">
          <button
            v-for="player in availablePlayers"
            :key="player.id"
            @click="selectedPlayer = player"
            :class="{ active: selectedPlayer?.id === player.id }"
          >
            #{{ player.number }} {{ player.name }}
            <span class="position-tag" :class="getPositionClass(player)">{{ getPositionLabel(player) }}</span>
            <span v-if="getPlayerZone(player)" class="zone-tag">зона {{ getPlayerZone(player) }}</span>
          </button>
        </div>
      </div>

      <div class="results-group" v-if="selectedPlayer && selectedAction && !isBlockAction">
        <h4>3. Результат</h4>
        <div class="btn-group">
          <button
            v-for="result in getResultsForAction(selectedAction)"
            :key="result"
            @click="completeAction(result)"
            class="result-btn"
            :class="getResultClass(result)"
          >
            {{ result }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>⚠️ Добавьте игроков и настройте состав</p>
    </div>

    <!-- === ИСТОРИЯ МАТЧА === -->
    <div class="full-history">
      <h4>📋 История матча:</h4>

      <div v-if="allEventsSorted.length === 0 && store.currentRally.actions.length === 0" class="empty-history">
        Ожидание действий...
      </div>

      <div v-if="store.currentRally.actions.length > 0" class="rally-group current-rally">
        <div class="rally-header current-rally-header">
          <span class="rally-number">🔄 Текущий розыгрыш</span>
          <span class="rally-score">Счет: {{ store.currentRally.score.home }} : {{ store.currentRally.score.away }}</span>
        </div>
        <div class="rally-actions">
          <div
            v-for="(action, actionIdx) in store.currentRally.actions"
            :key="actionIdx"
            class="history-action-item"
            :class="getActionItemClass(action)"
          >
            <span class="action-number">#{{ actionIdx + 1 }}</span>
            <span class="action-text">{{ formatAction(action) }}</span>
          </div>
        </div>
      </div>

      <div v-for="item in allEventsSorted" :key="item.id">
        <div v-if="item.type === 'rally'" class="rally-group">
          <div class="rally-header" :class="item.isPointWon ? 'rally-won' : 'rally-lost'">
            <span class="rally-number">Розыгрыш #{{ getRallyIndex(item) }}</span>
            <span class="rally-score">Счет: {{ item.score.home }} : {{ item.score.away }}</span>
            <span class="rally-result">{{ item.isPointWon ? '✅ ОЧКО!' : '❌ ОШИБКА' }}</span>
            <span class="rally-set">Сет {{ item.setNumber }}</span>
          </div>
          <div class="rally-actions">
            <div
              v-for="(action, actionIdx) in item.actions"
              :key="actionIdx"
              class="history-action-item"
              :class="getActionItemClass(action)"
            >
              <span class="action-number">#{{ actionIdx + 1 }}</span>
              <span class="action-text">{{ formatAction(action) }}</span>
            </div>
          </div>
        </div>

        <div v-else class="event-item" :class="item.type">
          <span class="event-icon">{{ getEventIcon(item) }}</span>
          <span class="event-text">{{ formatEvent(item) }}</span>
          <span class="event-score">Счет: {{ item.score.home }} : {{ item.score.away }}</span>
          <span class="event-set">Сет {{ item.setNumber }}</span>
        </div>
      </div>
    </div>

    <div class="actions-row">
      <button @click="undoLastAction" class="undo-btn">↩ Отменить</button>
      <button @click="resetRally" class="reset-btn">⟳ Сбросить текущий</button>
      <button @click="clearHistory" class="clear-btn">🗑 Очистить историю</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useMatchStore } from '@/stores/matchStore'

const store = useMatchStore()

const selectedAction = ref(null)
const selectedPlayer = ref(null)
const selectedBlockPlayers = ref([])
const selectedBlockType = ref(null)

// === ВСЕ ИГРОКИ ===
const allPlayers = computed(() => {
  const rotation = store.team.currentRotation || []
  const libero = store.team.libero
  const players = rotation.filter(p => p !== null && p !== undefined)
  if (libero && !players.some(p => p.id === libero.id)) {
    players.push(libero)
  }
  return players
})

// === СОБЫТИЯ ===
const allEvents = computed(() => store.events || [])
const allEventsSorted = computed(() => {
  return [...allEvents.value].sort((a, b) => (b.order || 0) - (a.order || 0))
})

const allRallies = computed(() => {
  return store.events
    .filter(e => e.type === 'rally')
    .sort((a, b) => (b.order || 0) - (a.order || 0))
})

const rallyCounter = computed(() => allRallies.value.length)

function getRallyIndex(rally) {
  const index = allRallies.value.findIndex(r => r.id === rally.id)
  return index !== -1 ? index + 1 : 0
}

// === ФУНКЦИИ ДЛЯ СОБЫТИЙ ===
function getEventIcon(event) {
  const icons = {
    'libero': '🔄',
    'substitution': '🔄',
    'timeout': '⏸'
  }
  return icons[event.type] || '📌'
}

function formatEvent(event) {
  switch (event.type) {
    case 'libero': {
      const direction = event.direction === 'in' ? 'вход' : 'выход'
      const playerName = event.player?.name || '???'
      const positionName = event.player?.positionName || ''
      const replacedName = event.replacedPlayer?.name || ''
      if (direction === 'вход') {
        return `${playerName} (${positionName}) — вход либеро (заменил ${replacedName})`
      } else {
        return `${playerName} (${positionName}) — выход либеро (вернулся ${replacedName})`
      }
    }
    case 'substitution': {
      const outName = event.playerOut?.name || '???'
      const outPos = event.playerOut?.positionName || ''
      const inName = event.playerIn?.name || '???'
      const inPos = event.playerIn?.positionName || ''
      return `${outName} (${outPos}) → ${inName} (${inPos}) — Замена`
    }
    case 'timeout':
      return `⏸ Тайм-аут (${event.teamName})`
    default:
      return 'Неизвестное событие'
  }
}

// === ЗНАЧКИ АМПЛУА ===
function getPositionClass(player) {
  const pos = player.position
  if (pos === 'OH') {
    const ohPlayers = allPlayers.value.filter(p => p.position === 'OH')
    const index = ohPlayers.indexOf(player)
    return index === 0 ? 'tag-oh1' : 'tag-oh2'
  }
  if (pos === 'MB') {
    const mbPlayers = allPlayers.value.filter(p => p.position === 'MB')
    const index = mbPlayers.indexOf(player)
    return index === 0 ? 'tag-mb1' : 'tag-mb2'
  }
  if (pos === 'OPP') return 'tag-opp'
  if (pos === 'S') return 'tag-s'
  if (pos === 'L') return 'tag-l'
  return ''
}

function getPositionLabel(player) {
  const pos = player.position
  if (pos === 'OH') {
    const ohPlayers = allPlayers.value.filter(p => p.position === 'OH')
    const index = ohPlayers.indexOf(player)
    return index === 0 ? 'OH1' : 'OH2'
  }
  if (pos === 'MB') {
    const mbPlayers = allPlayers.value.filter(p => p.position === 'MB')
    const index = mbPlayers.indexOf(player)
    return index === 0 ? 'MB1' : 'MB2'
  }
  if (pos === 'OPP') return 'OPP'
  if (pos === 'S') return 'S'
  if (pos === 'L') return 'L'
  return ''
}

function getPlayerZone(player) {
  if (!player) return null
  const rotation = store.team.currentRotation
  const index = rotation.findIndex(p => p && p.id === player.id)
  return index !== -1 ? index + 1 : null
}

function isInFrontRow(player) {
  const zone = getPlayerZone(player)
  return zone && [2, 3, 4].includes(zone)
}

function isInZone1(player) {
  const zone = getPlayerZone(player)
  return zone === 1
}

// === БЛОК ===
const isBlockAction = computed(() => {
  return selectedAction.value === 'block'
})

const availableBlockPlayers = computed(() => {
  return allPlayers.value.filter(p => isInFrontRow(p))
})

function getPlayersInZones(zones) {
  const players = []
  zones.forEach(zone => {
    const player = allPlayers.value.find(p => getPlayerZone(p) === zone)
    if (player) players.push(player)
  })
  return players
}

function areZonesAvailable(zones) {
  const players = getPlayersInZones(zones)
  return players.length === zones.length
}

function selectBlockPlayers(type, players) {
  selectedBlockType.value = type
  selectedBlockPlayers.value = players
}

function executeBlock(result) {
  if (selectedBlockPlayers.value.length === 0) return

  const mainPlayer = selectedBlockPlayers.value[0]
  const blockType = selectedBlockType.value

  let resultCode = result
  if (result === 'kill') {
    resultCode = 'block_point'
  } else if (result === 'error') {
    resultCode = 'error'
  } else {
    resultCode = 'continue'
  }

  store.addAction('block', mainPlayer.id, resultCode, null, {
    blockType: blockType,
    players: selectedBlockPlayers.value.map(p => p.id),
    zones: selectedBlockPlayers.value.map(p => getPlayerZone(p))
  })

  selectedBlockPlayers.value = []
  selectedBlockType.value = null
  selectedAction.value = null
  selectedPlayer.value = null
}

// === ОПРЕДЕЛЕНИЕ ДОСТУПНЫХ ДЕЙСТВИЙ ===
const availableActions = computed(() => {
  const actions = store.currentRally.actions
  const lastAction = actions.length > 0 ? actions[actions.length - 1] : null

  if (!store.currentRally.isActive) return []

  if (lastAction && ['kill', 'error', 'ace', 'block_point', 'opponent_error'].includes(lastAction.result)) {
    return store.team.isServing ? ['serve'] : ['reception']
  }

  if (lastAction && ['continue', 'none', 'perfect', 'positive', 'negative', 'good_dig', 'assist', 'dig', 'block', 'defense'].includes(lastAction.result)) {
    switch (lastAction.type) {
      case 'serve':
        return ['block']
      case 'block':
        return ['dig']
      case 'dig':
        return ['set', 'attack']
      case 'reception':
        if (lastAction.result === 'continue') {
          return ['block']
        }
        return ['set', 'attack']
      case 'set':
        return ['attack']
      case 'attack':
        if (lastAction.result === 'defense') {
          return ['block']
        } else if (lastAction.result === 'block') {
          return ['dig']
        }
        return ['block']
      default:
        return []
    }
  }

  if (actions.length === 0) {
    return store.team.isServing ? ['serve'] : ['reception']
  }

  return store.team.isServing ? ['serve'] : ['reception']
})

function getActionLabel(action) {
  const labels = {
    serve: '🏐 Подача',
    reception: '📥 Прием',
    set: '🎯 Пас',
    attack: '💥 Атака',
    block: '🛡 Блок',
    dig: '🛡 Защита'
  }
  return labels[action] || action
}

// === ДОСТУПНЫЕ ИГРОКИ ===
const availablePlayers = computed(() => {
  if (!selectedAction.value || isBlockAction.value) return []

  const action = selectedAction.value
  const players = allPlayers.value

  const actions = store.currentRally.actions
  const firstTouchAction = actions.find(a => a.type === 'reception' || a.type === 'dig')
  const firstTouchPlayerId = firstTouchAction?.playerId
  const secondTouchAction = actions.find(a => a.type === 'set')
  const secondTouchPlayerId = secondTouchAction?.playerId

  let filteredPlayers = [...players]

  switch (action) {
    case 'serve':
      return players.filter(p => isInZone1(p))

    case 'attack': {
      const excludeIds = secondTouchPlayerId ? [secondTouchPlayerId] : []
      filteredPlayers = players.filter(p => !excludeIds.includes(p.id))
      return [...filteredPlayers].sort((a, b) => {
        const aZone = getPlayerZone(a)
        const bZone = getPlayerZone(b)
        const aFront = aZone && [2, 3, 4].includes(aZone)
        const bFront = bZone && [2, 3, 4].includes(bZone)
        if (aFront && !bFront) return -1
        if (!aFront && bFront) return 1
        const priority = ['OPP', 'OH', 'MB', 'S', 'L']
        const aIdx = priority.indexOf(a.position)
        const bIdx = priority.indexOf(b.position)
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
      })
    }

    case 'reception': {
      const priority = ['L', 'OH', 'OPP', 'MB', 'S']
      return [...players].sort((a, b) => {
        const aIdx = priority.indexOf(a.position)
        const bIdx = priority.indexOf(b.position)
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
      })
    }

    case 'set': {
      const priority = ['S', 'L', 'OH', 'MB', 'OPP']
      const excludeIds = firstTouchPlayerId ? [firstTouchPlayerId] : []
      filteredPlayers = players.filter(p => !excludeIds.includes(p.id))
      return [...filteredPlayers].sort((a, b) => {
        const aIdx = priority.indexOf(a.position)
        const bIdx = priority.indexOf(b.position)
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
      })
    }

    case 'dig': {
      const priority = ['L', 'OH', 'OPP', 'MB', 'S']
      return [...players].sort((a, b) => {
        const aIdx = priority.indexOf(a.position)
        const bIdx = priority.indexOf(b.position)
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
      })
    }

    default:
      return players
  }
})

// === РЕЗУЛЬТАТЫ ===
function getResultsForAction(action) {
  const map = {
    serve: ['Эйс', 'Ошибка', 'В игре'],
    reception: ['Идеальный', 'Хороший', 'Плохой', 'Ошибка соперника', 'Переход (очко)', 'Переход (в игре)', 'Ошибка'],
    set: ['Ассист', 'Обычный', 'Ошибка'],
    attack: ['Очко', 'Ошибка', 'Защита (соперник)', 'Блок (соперник)'],
    block: ['Очко', 'Ошибка', 'Нет'],
    dig: ['Поднял', 'Ошибка']
  }
  return map[action] || []
}

function getResultClass(result) {
  if (['Эйс', 'Очко', 'Идеальный', 'Ассист', 'Поднял', 'Переход (очко)'].includes(result)) {
    return 'success'
  }
  if (['Ошибка', 'Плохой'].includes(result)) {
    return 'error'
  }
  if (['Защита (соперник)', 'Блок (соперник)'].includes(result)) {
    return 'opponent'
  }
  return 'neutral'
}

function getActionItemClass(action) {
  if (action.result === 'kill' || action.result === 'ace' || action.result === 'block_point' || action.result === 'opponent_error') {
    return 'point-won'
  }
  if (action.result === 'error') {
    return 'point-lost'
  }
  if (action.result === 'defense' || action.result === 'block' || action.result === 'Защита (соперник)' || action.result === 'Блок (соперник)') {
    return 'opponent'
  }
  return ''
}

function completeAction(result) {
  const actionMap = {
    serve: 'serve',
    reception: 'reception',
    set: 'set',
    attack: 'attack',
    block: 'block',
    dig: 'dig'
  }

  const resultMap = {
    'Эйс': 'ace',
    'Очко': 'kill',
    'Ошибка': 'error',
    'Ошибка соперника': 'opponent_error',
    'Идеальный': 'perfect',
    'Хороший': 'positive',
    'Плохой': 'negative',
    'Переход (очко)': 'kill',
    'Переход (в игре)': 'continue',
    'Ассист': 'assist',
    'Обычный': 'continue',
    'Защита (соперник)': 'defense',
    'Блок (соперник)': 'block',
    'Поднял': 'good_dig',
    'В игре': 'continue',
    'Блок': 'block_point',
    'Нет': 'none'
  }

  const actionType = actionMap[selectedAction.value]
  const resultCode = resultMap[result]

  store.addAction(actionType, selectedPlayer.value.id, resultCode, null, {
    originalResult: result
  })

  selectedAction.value = null
  selectedPlayer.value = null

  const isRallyEnded = ['ace', 'kill', 'error', 'block_point', 'opponent_error'].includes(resultCode)
  if (!isRallyEnded) {
    nextTick(() => {
      const nextActions = availableActions.value
      if (nextActions.length > 0) {
        selectedAction.value = nextActions[0]
      }
    })
  }
}

function toggleServing() {
  store.team.isServing = !store.team.isServing
  store.currentRally.isServing = store.team.isServing
  store.applyLiberoRules(false)
}

function undoLastAction() {
  if (store.currentRally.actions.length > 0) {
    store.currentRally.actions.pop()
    selectedAction.value = null
    selectedPlayer.value = null
    selectedBlockPlayers.value = []
    selectedBlockType.value = null
  }
}

function resetRally() {
  if (confirm('Сбросить все действия текущего розыгрыша?')) {
    store.currentRally.actions = []
    selectedAction.value = null
    selectedPlayer.value = null
    selectedBlockPlayers.value = []
    selectedBlockType.value = null
  }
}

function clearHistory() {
  if (confirm('Очистить всю историю розыгрышей?')) {
    store.events = []
    store.currentRally.actions = []
    store.currentRally.score = { home: 0, away: 0 }
  }
}

function formatAction(action) {
  const player = store.team.players.find(p => p.id === action.playerId)

  let extraInfo = ''
  if (action.type === 'block' && action.meta) {
    const meta = action.meta
    if (meta.blockType === 'double') {
      const zones = meta.zones?.join('-') || ''
      extraInfo = ` (двойной блок: зоны ${zones})`
    } else if (meta.blockType === 'triple') {
      extraInfo = ' (тройной блок)'
    }
  }

  let resultText = action.meta?.originalResult || action.result

  const displayMap = {
    ace: 'Эйс',
    kill: 'Очко',
    error: 'Ошибка',
    opponent_error: 'Ошибка соперника',
    perfect: 'Идеальный',
    positive: 'Хороший',
    negative: 'Плохой',
    assist: 'Ассист',
    continue: 'В игре',
    good_dig: 'Поднял',
    block_point: 'Блок',
    none: 'Нет',
    defense: 'Защита (соперник)',
    block: 'Блок (соперник)'
  }

  resultText = displayMap[resultText] || resultText

  const playerName = player?.name || '???'
  const actionType = {
    serve: 'Подача',
    reception: 'Прием',
    set: 'Пас',
    attack: 'Атака',
    block: 'Блок',
    dig: 'Защита'
  }[action.type] || action.type

  return `${playerName} — ${actionType} (${resultText})${extraInfo}`
}

watch(availableActions, () => {
  if (selectedAction.value && !availableActions.value.includes(selectedAction.value)) {
    selectedAction.value = null
    selectedPlayer.value = null
    selectedBlockPlayers.value = []
    selectedBlockType.value = null
  }
})

watch(() => store.currentRally.actions, () => {
  nextTick(() => {})
}, { deep: true })
</script>

<style scoped>
.scoreboard {
  max-width: 800px;
  margin: 0 auto;
}
.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 10px;
}
.team-score {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 18px;
}
.team-score span {
  font-size: 48px;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
}
.team-score.opponent span {
  color: #ff9800;
}
.set-info {
  font-size: 18px;
  background: rgba(255,255,255,0.2);
  padding: 8px 20px;
  border-radius: 20px;
}
.status-bar {
  margin-bottom: 15px;
}
.status-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  flex-wrap: wrap;
}
.status-label {
  font-size: 14px;
  color: #666;
}
.status {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 16px;
}
.status.serving {
  background: #e8f5e9;
  color: #4caf50;
}
.status.receiving {
  background: #fff3e0;
  color: #ff9800;
}
.toggle-status-btn {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 16px;
}
.toggle-status-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}
.rally-counter {
  font-weight: 600;
  color: #667eea;
  font-size: 14px;
}
.actions-panel {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}
.action-group,
.players-group,
.results-group {
  margin-bottom: 15px;
}
h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.btn-group button {
  padding: 8px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-group button:hover {
  background: #f0f4ff;
  border-color: #667eea;
}
.btn-group button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}
.position-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  color: white;
  margin-left: 4px;
}
.tag-oh1 { background: #1976d2; }
.tag-oh2 { background: #42a5f5; }
.tag-mb1 { background: #c62828; }
.tag-mb2 { background: #ef5350; }
.tag-opp { background: #616161; }
.tag-s { background: #2e7d32; }
.tag-l { background: #e65100; }
.zone-tag {
  font-size: 10px;
  color: #999;
  margin-left: 4px;
}

.result-btn.success {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}
.result-btn.error {
  background: #f44336;
  color: white;
  border-color: #f44336;
}
.result-btn.neutral {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}
.result-btn.opponent {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}
.waiting-message {
  padding: 10px;
  color: #666;
  font-style: italic;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
}
.empty-state {
  background: #fff3cd;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  color: #856404;
  margin-bottom: 20px;
}

.block-options {
  width: 100%;
}
.block-section {
  margin-bottom: 12px;
}
.block-section:last-child {
  margin-bottom: 0;
}
.block-section-label {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 6px;
}
.block-players-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.block-player-btn {
  padding: 4px 12px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.block-player-btn:hover {
  background: #e8f5e9;
  border-color: #4caf50;
}
.block-player-btn .player-number {
  font-weight: 600;
  color: #333;
}
.block-player-btn .player-name {
  color: #555;
}
.block-double-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}
.block-double-btn {
  padding: 6px 10px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.block-double-btn:hover:not(:disabled) {
  background: #fff3e0;
  border-color: #ff9800;
}
.block-double-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.block-double-players {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}
.block-double-player {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  width: 100%;
  justify-content: center;
}
.block-double-player .player-number {
  font-weight: 600;
  color: #333;
}
.block-double-player .player-name {
  color: #555;
}
.block-double-zones {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}
.block-triple-btn {
  padding: 8px 14px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}
.block-triple-btn:hover:not(:disabled) {
  background: #ffebee;
  border-color: #f44336;
}
.block-triple-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.block-triple-player {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
}
.block-triple-player .player-number {
  font-weight: 600;
  color: #333;
}
.block-triple-player .player-name {
  color: #555;
}
.block-triple-zones {
  font-size: 10px;
  color: #999;
  margin-left: 4px;
}
.block-option-btn .unavailable {
  color: #999;
  font-size: 11px;
}
.block-result-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}
.block-result-section h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.block-player-btn.zone-2 { border-left: 4px solid #2196f3; }
.block-player-btn.zone-3 { border-left: 4px solid #4caf50; }
.block-player-btn.zone-4 { border-left: 4px solid #ff9800; }
.block-double-btn.zone-2-3 { border-left: 4px solid #9c27b0; }
.block-double-btn.zone-2-4 { border-left: 4px solid #00bcd4; }
.block-double-btn.zone-3-4 { border-left: 4px solid #e91e63; }
.block-triple-btn { border-left: 4px solid #f44336; }

.full-history {
  background: white;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 15px;
  max-height: 500px;
  overflow-y: auto;
  position: relative;
}
.full-history h4 {
  position: sticky;
  top: 0;
  background: white;
  padding: 12px 15px;
  margin: 0;
  z-index: 10;
  border-bottom: 2px solid #667eea;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.full-history .rally-group {
  margin: 0 15px 15px 15px;
}
.full-history .rally-group:last-child {
  margin-bottom: 15px;
}
.full-history .event-item {
  margin: 0 15px 8px 15px;
}
.full-history .empty-history {
  padding: 20px 15px;
  text-align: center;
  color: #999;
  font-style: italic;
}
.full-history .current-rally {
  margin: 0 15px 15px 15px;
}
.full-history .current-rally:last-child {
  margin-bottom: 15px;
}
.rally-group {
  margin-bottom: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}
.rally-group:last-child {
  margin-bottom: 0;
}
.rally-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 8px 12px;
  background: #f5f5f5;
  font-weight: 500;
  flex-wrap: wrap;
}
.rally-header.rally-won {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
}
.rally-header.rally-lost {
  background: #ffebee;
  border-left: 4px solid #f44336;
}
.current-rally-header {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
}
.rally-number {
  font-weight: 600;
  color: #333;
}
.rally-score {
  color: #555;
  font-size: 14px;
}
.rally-result {
  font-weight: 600;
  font-size: 14px;
}
.rally-won .rally-result {
  color: #4caf50;
}
.rally-lost .rally-result {
  color: #f44336;
}
.rally-set {
  color: #999;
  font-size: 12px;
  margin-left: auto;
}
.rally-actions {
  padding: 8px 12px;
  background: #fafafa;
}
.history-action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  font-size: 13px;
}
.history-action-item.point-won {
  background: #e8f5e9;
  border-left: 2px solid #4caf50;
}
.history-action-item.point-lost {
  background: #ffebee;
  border-left: 2px solid #f44336;
}
.history-action-item.opponent {
  background: #e3f2fd;
  border-left: 2px solid #2196f3;
}
.history-action-item .action-number {
  font-weight: bold;
  color: #999;
  font-size: 11px;
  min-width: 24px;
}
.history-action-item .action-text {
  flex: 1;
}
.event-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 6px;
  font-size: 13px;
  background: #f0f4ff;
  border-left: 3px solid #667eea;
}
.event-item.libero {
  background: #fff3e0;
  border-left-color: #ff9800;
}
.event-item.substitution {
  background: #e8f5e9;
  border-left-color: #4caf50;
}
.event-item.timeout {
  background: #ffebee;
  border-left-color: #f44336;
}
.event-item.opponent {
  background: #e3f2fd;
  border-left-color: #2196f3;
}
.event-icon {
  font-size: 16px;
}
.event-text {
  flex: 1;
}
.event-score {
  color: #666;
  font-size: 12px;
}
.event-set {
  color: #999;
  font-size: 11px;
}
.actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.undo-btn,
.reset-btn,
.clear-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  min-width: 120px;
}
.undo-btn { background: #ff9800; color: white; }
.reset-btn { background: #e0e0e0; color: #333; }
.clear-btn { background: #f44336; color: white; }
@media (max-width: 600px) {
  .score-header {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  .rally-header {
    flex-direction: column;
    text-align: center;
    gap: 5px;
  }
  .rally-set {
    margin-left: 0;
  }
  .actions-row {
    flex-direction: column;
  }
  .actions-row button {
    width: 100%;
  }
  .position-tag {
    font-size: 8px;
    padding: 1px 6px;
  }
  .event-item {
    flex-wrap: wrap;
    gap: 4px;
  }
  .event-score {
    font-size: 10px;
  }
  .block-double-grid {
    grid-template-columns: 1fr;
  }
  .block-players-row {
    flex-direction: column;
  }
  .block-player-btn {
    width: 100%;
  }
}
</style>
