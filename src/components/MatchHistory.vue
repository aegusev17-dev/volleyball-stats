
<template>
  <section class="match-history">
    <h2>📚 История матчей</h2>

    <p v-if="matches.length === 0" class="empty">
      Сохранённых матчей пока нет.
      Перейдите во вкладку «Матч» и сохраните первую игру.
    </p>

    <div v-else class="match-list">
      <article
        v-for="match in matches"
        :key="match.id"
        class="match-card"
      >
        <div class="match-details">
          <h3>{{ match.name }}</h3>

          <p>
            Дата сохранения:
            {{ formatDate(match.savedAt) }}
          </p>

          <p>
            Команда:
            {{ match.teamData?.name || 'Моя команда' }}
          </p>

          <p>
            Игроков:
            {{ match.teamData?.players?.length || 0 }}
          </p>

          <p v-if="match.currentRally">
            Счёт текущего сета:
            {{ match.currentRally.score.home }}
            :
            {{ match.currentRally.score.away }}
          </p>
        </div>

        <div class="match-actions">
          <button
            class="open-btn"
            @click="loadMatch(match)"
          >
            Открыть матч
          </button>

          <button
            class="delete-btn"
            @click="removeMatch(match.id)"
          >
            Удалить
          </button>
        </div>
      </article>
    </div>

    <button class="refresh-btn" @click="refreshMatches">
      Обновить список
    </button>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMatchStore } from '@/stores/matchStore'
import {
  getSavedMatches,
  deleteMatch
} from '@/utils/matchStorage'

const emit = defineEmits(['match-loaded'])

const store = useMatchStore()
const matches = ref([])

function refreshMatches() {
  matches.value = getSavedMatches()
}

function formatDate(value) {
  if (!value) {
    return 'Не указана'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Неизвестная дата'
  }

  return date.toLocaleString('ru-RU')
}

function loadMatch(match) {
  const confirmed = confirm(
    `Загрузить матч «${match.name}»?\n` +
    'Текущее состояние игры будет заменено.'
  )

  if (!confirmed) {
    return
  }

  try {
    store.restoreMatchSnapshot(match)

    sessionStorage.setItem(
      'activeSavedMatchId',
      match.id
    )

    emit('match-loaded')
  } catch (error) {
    console.error('Ошибка восстановления матча:', error)

    alert(
      'Не удалось загрузить матч. ' +
      'Проверьте данные сохранения.'
    )
  }
}

function removeMatch(matchId) {
  const confirmed = confirm(
    'Вы действительно хотите удалить сохранённый матч?'
  )

  if (!confirmed) {
    return
  }

  try {
    deleteMatch(matchId)

    if (
      sessionStorage.getItem('activeSavedMatchId') === matchId
    ) {
      sessionStorage.removeItem('activeSavedMatchId')
    }

    refreshMatches()
  } catch (error) {
    console.error('Ошибка удаления матча:', error)
    alert('Не удалось удалить матч.')
  }
}

onMounted(refreshMatches)
</script>

<style scoped>
.match-history {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.match-history h2 {
  margin-bottom: 20px;
}

.empty {
  padding: 20px;
  border-radius: 8px;
  background: #f5f5f5;
  color: #555;
}

.match-list {
  display: grid;
  gap: 14px;
}

.match-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.match-details {
  min-width: 0;
}

.match-details h3 {
  margin: 0 0 10px;
  overflow-wrap: anywhere;
}

.match-details p {
  margin: 5px 0;
  color: #666;
}

.match-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.match-actions button,
.refresh-btn {
  padding: 10px 14px;
  border: none;
  border-radius: 7px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.open-btn {
  background: #667eea;
}

.open-btn:hover {
  background: #5365d5;
}

.delete-btn {
  background: #dc3545;
}

.delete-btn:hover {
  background: #bb2d3b;
}

.refresh-btn {
  margin-top: 18px;
  background: #555;
}

.refresh-btn:hover {
  background: #333;
}

@media (max-width: 600px) {
  .match-card {
    align-items: stretch;
    flex-direction: column;
  }

  .match-actions {
    flex-direction: row;
  }

  .match-actions button {
    flex: 1;
  }
}
</style>
