<template>
  <div class="lineup-storage-manager">
    <div class="storage-header">
      <h3>💾 Управление составами</h3>
      <div class="storage-actions">
        <button @click="saveCurrentLineup" class="btn btn-primary">
          💾 Сохранить текущий
        </button>
        <button @click="createDefault" class="btn btn-secondary">
          📋 Создать шаблон
        </button>
        <button @click="showImportModal = true" class="btn btn-info">
          📥 Импорт
        </button>
        <button @click="refreshList" class="btn btn-outline">
          🔄 Обновить
        </button>
      </div>
    </div>

    <!-- Информация о текущем составе -->
    <div class="current-info">
      <span>Текущий состав: <strong>{{ store.team.name || 'Не задан' }}</strong></span>
      <span>Игроков: {{ store.team.players?.length || 0 }}</span>
      <span v-if="store.team.libero">Либеро: #{{ store.team.libero.number }} {{ store.team.libero.name }}</span>
    </div>

    <!-- Список сохраненных составов -->
    <div class="lineup-list">
      <div v-if="lineups.length === 0" class="empty-state">
        <p>📭 Нет сохраненных составов</p>
        <p class="empty-hint">Создайте состав на вкладке "Игроки" и "Состав", затем сохраните его здесь</p>
        <button @click="createDefault" class="btn btn-primary">
          📋 Создать первый шаблон
        </button>
      </div>

      <div v-for="lineup in lineups" :key="lineup.id" class="lineup-item">
        <div class="lineup-info">
          <div class="lineup-name">{{ lineup.name }}</div>
          <div class="lineup-meta">
            <span>🏷️ {{ lineup.teamName || '—' }}</span>
            <span>👥 {{ lineup.players?.length || 0 }} игроков</span>
            <span class="lineup-date">📅 {{ formatDate(lineup.createdAt) }}</span>
          </div>
        </div>
        <div class="lineup-actions">
          <button @click="loadLineupById(lineup.id)" class="btn btn-success btn-sm" title="Загрузить">
            🔄 Загрузить
          </button>
          <button @click="exportLineup(lineup.id)" class="btn btn-info btn-sm" title="Экспорт в JSON">
            📤 Экспорт
          </button>
          <button @click="confirmDelete(lineup.id)" class="btn btn-danger btn-sm" title="Удалить">
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Модальное окно для импорта -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal">
        <h4>📥 Импорт состава</h4>
        <p>Вставьте JSON-данные состава (скопируйте из экспортированного файла):</p>
        <textarea v-model="importData" placeholder='{"name": "Мой состав", "teamName": "Команда", "players": [...]}'></textarea>
        <div class="modal-actions">
          <button @click="handleImportLineup" class="btn btn-primary">Импортировать</button>
          <button @click="showImportModal = false" class="btn btn-outline">Отмена</button>
        </div>
      </div>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal">
        <h4>⚠️ Подтверждение удаления</h4>
        <p>Вы уверены, что хотите удалить состав <strong>"{{ deleteTarget?.name }}"</strong>?</p>
        <p class="warning-text">Это действие нельзя отменить.</p>
        <div class="modal-actions">
          <button @click="deleteLineupConfirm" class="btn btn-danger">🗑 Удалить</button>
          <button @click="showDeleteConfirm = false" class="btn btn-outline">Отмена</button>
        </div>
      </div>
    </div>

    <!-- Модальное окно для названия -->
    <div v-if="showNameModal" class="modal-overlay" @click.self="showNameModal = false">
      <div class="modal">
        <h4>💾 Сохранить состав</h4>
        <p>Введите название для сохранения:</p>
        <input v-model="newLineupName" placeholder="Например: Основной состав 2024" class="modal-input" />
        <div class="modal-actions">
          <button @click="saveWithName" class="btn btn-primary">💾 Сохранить</button>
          <button @click="showNameModal = false" class="btn btn-outline">Отмена</button>
        </div>
      </div>
    </div>

    <!-- Уведомления -->
    <div v-if="notification" class="notification" :class="notification.type">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import {
  getSavedLineups,
  saveLineup,
  loadLineup,
  deleteLineup,
  exportLineup as exportLineupFile,
  importLineup as importLineupFromStorage,
  createDefaultLineup,
  autoSaveCurrentLineup,
  loadAutoSave
} from '@/utils/lineupStorage'
import { useMatchStore } from '@/stores/matchStore'

const store = useMatchStore()

// === Константы для амплуа ===
const POSITIONS = {
  OH: 'Доигровщик',
  MB: 'Центральный блокирующий',
  OPP: 'Диагональный',
  S: 'Связующий',
  L: 'Либеро'
}

// === Состояние ===
const lineups = ref([])
const showImportModal = ref(false)
const showDeleteConfirm = ref(false)
const showNameModal = ref(false)
const importData = ref('')
const deleteTarget = ref(null)
const newLineupName = ref('')
const notification = ref(null)

// === Методы ===
function refreshList() {
  lineups.value = getSavedLineups()
}

// Сохранить текущий состав
function saveCurrentLineup() {
  const team = store.team

  if (team.players.length === 0) {
    showNotification('⚠️ Нет игроков для сохранения! Сначала добавьте игроков.', 'warning')
    return
  }

  newLineupName.value = `Состав от ${new Date().toLocaleDateString()}`
  showNameModal.value = true
}

// Сохранение с введенным названием
function saveWithName() {
  const name = newLineupName.value.trim()
  if (!name) {
    showNotification('⚠️ Введите название состава!', 'warning')
    return
  }

  const team = store.team

  const lineupData = {
    name: name,
    teamName: team.name,
    players: team.players.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      positionName: p.positionName
    })),
    lineup: team.lineup.map(p => p?.id || null),
    liberoId: team.libero?.id || null,
    currentRotation: team.currentRotation.map(p => p?.id || null),
    rotationStep: team.rotationStep || 0,
    isLiberoOnCourt: team.isLiberoOnCourt || false
  }

  const result = saveLineup(lineupData)
  if (result) {
    showNotification(`✅ Состав "${name}" сохранен!`, 'success')
    refreshList()
    autoSaveCurrentLineup(team)
    showNameModal.value = false
    newLineupName.value = ''
  } else {
    showNotification('❌ Ошибка сохранения состава!', 'error')
  }
}

// Загрузить состав
function loadLineupById(id) {
  const data = loadLineup(id)
  if (!data) {
    showNotification('❌ Состав не найден!', 'error')
    return
  }

  if (!confirm(`Загрузить состав "${data.name}"? Это заменит текущие данные.`)) return

  try {
    // Создаем карту амплуа из POSITIONS
    const POSITIONS = {
      OH: 'Доигровщик',
      MB: 'Центральный блокирующий',
      OPP: 'Диагональный',
      S: 'Связующий',
      L: 'Либеро'
    }

    // Восстанавливаем игроков
    store.team.players = data.players.map(p => ({
      ...p,
      positionName: POSITIONS[p.position] || p.positionName || 'без амплуа',
      stats: {
        attacks: { total: 0, kills: 0, errors: 0, digs: 0 },
        serves: { total: 0, aces: 0, errors: 0 },
        blocks: { total: 0, points: 0, errors: 0 },
        receptions: { total: 0, positive: 0, perfect: 0, errors: 0 },
        sets: { total: 0, assists: 0 },
        substitutions: { in: 0, out: 0 }
      }
    }))

    store.team.name = data.teamName || 'Моя команда'

    // Восстанавливаем состав
    if (data.lineup && data.lineup.length > 0) {
      const lineupPlayers = data.lineup.map(id =>
        store.team.players.find(p => p.id === id)
      ).filter(p => p)

      if (lineupPlayers.length >= 6) {
        store.setLineup(lineupPlayers)
      } else {
        // Если в JSON меньше 6 игроков, не применяем состав
        console.warn('Недостаточно игроков для восстановления состава')
      }
    }

    // Назначаем либеро
    if (data.liberoId) {
      const libero = store.team.players.find(p => p.id === data.liberoId)
      if (libero && libero.position === 'L') {
        store.setLibero(data.liberoId)
      }
    }

    // === ВАЖНО: Обновляем selectedPlayers в LineupManager ===
    // Используем глобальное событие или forceUpdate через store
    // Так как мы не можем напрямую обновить selectedPlayers из другого компонента,
    // мы перезагружаем страницу с сохранением текущего состояния
    // Или просто загружаем данные и они подхватятся через watch

    showNotification(`✅ Состав "${data.name}" загружен!`, 'success')
    refreshList()

    // Принудительно обновляем интерфейс
    // Можно вызвать событие, которое подхватит LineupManager
    window.dispatchEvent(new CustomEvent('lineup-loaded'))

  } catch (error) {
    showNotification('❌ Ошибка загрузки состава!', 'error')
    console.error(error)
  }
}

// Экспорт
function exportLineup(id) {
  const lineup = loadLineup(id)
  if (!lineup) {
    showNotification('❌ Состав не найден!', 'error')
    return
  }

  const blob = new Blob([JSON.stringify(lineup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `lineup_${lineup.name.replace(/\s+/g, '_')}.json`
  link.click()
  URL.revokeObjectURL(url)

  showNotification(`📤 Экспорт "${lineup.name}" выполнен!`, 'success')
}

// Удаление
function confirmDelete(id) {
  const lineup = lineups.value.find(l => l.id === id)
  if (lineup) {
    deleteTarget.value = lineup
    showDeleteConfirm.value = true
  }
}

function deleteLineupConfirm() {
  if (deleteTarget.value) {
    deleteLineup(deleteTarget.value.id)
    showNotification(`🗑 Состав "${deleteTarget.value.name}" удален`, 'info')
    refreshList()
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

// Создать шаблон
function createDefault() {
  const name = prompt('Введите название шаблона:', `Шаблон ${new Date().toLocaleDateString()}`)
  if (!name) return

  const teamName = prompt('Введите название команды:', 'Моя команда') || 'Моя команда'

  const defaultData = createDefaultLineup(teamName)
  defaultData.name = name

  const result = saveLineup(defaultData)
  if (result) {
    showNotification(`✅ Шаблон "${name}" создан!`, 'success')
    refreshList()
  } else {
    showNotification('❌ Ошибка создания шаблона!', 'error')
  }
}

// Импорт
function handleImportLineup() {
  if (!importData.value.trim()) {
    showNotification('⚠️ Введите JSON-данные!', 'warning')
    return
  }

  const result = importLineupFromStorage(importData.value)
  if (result) {
    // После импорта обновляем отображение амплуа
    const data = JSON.parse(importData.value)
    if (data.players) {
      data.players.forEach(p => {
        const player = store.team.players.find(sp => sp.name === p.name && sp.number === p.number)
        if (player) {
          player.positionName = POSITIONS[p.position] || 'без амплуа'
        }
      })
    }
    showNotification('✅ Состав импортирован!', 'success')
    refreshList()
    showImportModal.value = false
    importData.value = ''
  } else {
    showNotification('❌ Ошибка импорта! Проверьте формат данных.', 'error')
  }
}

// Уведомления
let notificationTimeout = null

function showNotification(message, type = 'info') {
  notification.value = { message, type }
  clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => {
    notification.value = null
  }, 4000)
}

function formatDate(dateString) {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateString
  }
}

onMounted(() => {
  refreshList()

  const autoSave = loadAutoSave()
  if (autoSave && store.team.players.length === 0 && lineups.value.length === 0) {
    setTimeout(() => {
      showNotification('💡 Подсказка: создайте состав на вкладках "Игроки" и "Состав", затем сохраните его здесь', 'info')
    }, 1000)
  }
})

watch(() => store.team.players.length, (newLen) => {
  if (newLen > 0) {
    autoSaveCurrentLineup(store.team)
  }
}, { immediate: false })
</script>

<style scoped>
/* ... стили остаются без изменений ... */
.lineup-storage-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.storage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e9ecef;
}

.storage-header h3 {
  margin: 0;
  color: #333;
}

.storage-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.current-info {
  display: flex;
  gap: 20px;
  padding: 10px 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  flex-wrap: wrap;
  color: #495057;
}

.current-info strong {
  color: #333;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: #667eea;
  color: white;
}
.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}
.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #28a745;
  color: white;
}
.btn-success:hover {
  background: #218838;
}

.btn-danger {
  background: #dc3545;
  color: white;
}
.btn-danger:hover {
  background: #c82333;
}

.btn-info {
  background: #17a2b8;
  color: white;
}
.btn-info:hover {
  background: #138496;
}

.btn-outline {
  background: transparent;
  color: #6c757d;
  border: 2px solid #dee2e6;
}
.btn-outline:hover {
  background: #f8f9fa;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.lineup-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state p {
  margin: 5px 0;
}

.empty-hint {
  font-size: 14px;
  color: #adb5bd;
}

.empty-state .btn {
  margin-top: 15px;
}

.lineup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  flex-wrap: wrap;
  gap: 10px;
  transition: all 0.2s;
}

.lineup-item:hover {
  background: #f1f3f5;
  border-color: #667eea;
}

.lineup-info {
  flex: 1;
  min-width: 150px;
}

.lineup-name {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.lineup-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #868e96;
  margin-top: 4px;
  flex-wrap: wrap;
}

.lineup-date {
  color: #adb5bd;
}

.lineup-actions {
  display: flex;
  gap: 6px;
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
  animation: fadeIn 0.2s ease;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.modal h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.modal p {
  color: #666;
  margin-bottom: 15px;
}

.warning-text {
  color: #dc3545 !important;
  font-size: 14px;
}

.modal textarea {
  width: 100%;
  height: 200px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
}

.modal-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #667eea;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.notification {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 14px 24px;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  z-index: 2000;
  animation: slideUp 0.4s ease;
  max-width: 400px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.notification.success {
  background: #28a745;
}
.notification.error {
  background: #dc3545;
}
.notification.warning {
  background: #ffc107;
  color: #333;
}
.notification.info {
  background: #17a2b8;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .storage-header {
    flex-direction: column;
    align-items: stretch;
  }

  .storage-actions {
    justify-content: stretch;
  }

  .storage-actions .btn {
    flex: 1;
    text-align: center;
    font-size: 12px;
    padding: 8px 12px;
  }

  .lineup-item {
    flex-direction: column;
    align-items: stretch;
  }

  .lineup-actions {
    justify-content: flex-end;
  }

  .current-info {
    flex-direction: column;
    gap: 5px;
  }

  .modal {
    padding: 20px;
  }

  .notification {
    left: 20px;
    right: 20px;
    bottom: 20px;
    max-width: none;
    font-size: 14px;
  }
}
</style>
