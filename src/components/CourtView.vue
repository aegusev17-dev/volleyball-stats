<template>
  <div class="court-container">
    <div v-if="!hasPlayers" class="empty-state">
      <p>⚠️ Добавьте игроков и настройте состав в разделе "Состав"</p>
    </div>
    <div v-else class="court-wrapper" :key="updateKey">
      <h4 class="team-title">
        {{ teamName }}
        <span v-if="isServing" class="serving-badge">⚡ Подаем</span>
        <span v-else class="receiving-badge">🛡 Принимаем</span>
        <span class="rotation-step">Шаг {{ rotationStep + 1 }}</span>
      </h4>

      <div class="volleyball-court">
        <div class="net-line">━━━━ СЕТКА ━━━━</div>

        <div class="zones">
          <div
            v-for="zone in [4, 3, 2]"
            :key="zone"
            class="zone front-zone"
            :class="getZoneClass(zone)"
          >
            <div class="zone-number">{{ zone }}</div>
            <div v-if="getPlayerInZone(zone)" class="player-info">
              <div class="player-number">#{{ getPlayerInZone(zone).number }}</div>
              <div class="player-name">{{ getPlayerInZone(zone).name }}</div>
              <div class="player-position">{{ getPlayerInZone(zone).positionName || '' }}</div>
              <div v-if="isLibero(getPlayerInZone(zone))" class="libero-badge">L</div>
            </div>
            <div v-else class="empty-zone">—</div>
          </div>

          <div
            v-for="zone in [5, 6, 1]"
            :key="zone"
            class="zone back-zone"
            :class="getZoneClass(zone)"
          >
            <div class="zone-number">{{ zone }}</div>
            <div v-if="getPlayerInZone(zone)" class="player-info">
              <div class="player-number">#{{ getPlayerInZone(zone).number }}</div>
              <div class="player-name">{{ getPlayerInZone(zone).name }}</div>
              <div class="player-position">{{ getPlayerInZone(zone).positionName || '' }}</div>
              <div v-if="isLibero(getPlayerInZone(zone))" class="libero-badge">L</div>
              <div v-if="zone === 1 && isServing" class="serving-arrow">⬆</div>
            </div>
            <div v-else class="empty-zone">—</div>
          </div>
        </div>

        <div class="rotation-info">
          <span>Подача: зона 1</span>
          <span class="status-text" :class="isServing ? 'serving-text' : 'receiving-text'">
            {{ isServing ? '⚡ Подаем' : '🛡 Принимаем' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref, nextTick } from 'vue'
import { useMatchStore } from '@/stores/matchStore'

const store = useMatchStore()

// Ключ для принудительного обновления
const updateKey = ref(0)

const hasPlayers = computed(() => {
  return (store.team?.players?.length || 0) > 0
})

const teamName = computed(() => {
  return store.team?.name || 'Моя команда'
})

const isServing = computed(() => {
  return store.team?.isServing || false
})

const rotationStep = computed(() => {
  return store.team?.rotationStep || 0
})

function getPlayerInZone(zone) {
  const rotation = store.team?.currentRotation || []
  const index = zone - 1
  if (index >= 0 && index < rotation.length) {
    return rotation[index]
  }
  return null
}

function getZoneClass(zone) {
  const player = getPlayerInZone(zone)
  const classes = []

  if (player) {
    classes.push('occupied')
    if (isLibero(player)) {
      classes.push('libero-zone')
    }
    if (zone === 1 && isServing.value) {
      classes.push('serving-zone')
    }
  }

  return classes.join(' ')
}

function isLibero(player) {
  if (!player) return false
  const libero = store.team?.libero
  return libero && player.id === libero.id
}

// Принудительное обновление
function forceUpdate() {
  nextTick(() => {
    updateKey.value++
  })
}

// Следим за изменениями
watch(() => store.team.currentRotation, () => {
  forceUpdate()
}, { deep: true })

watch(() => store.team.isServing, () => {
  forceUpdate()
})

watch(() => store.team.isLiberoOnCourt, () => {
  forceUpdate()
})

watch(() => store.currentRally.score, () => {
  forceUpdate()
}, { deep: true })
</script>

<style scoped>
.court-container {
  max-width: 600px;
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

.court-wrapper {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.team-title {
  color: white;
  text-align: center;
  margin-bottom: 15px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.serving-badge {
  background: #4caf50;
  color: white;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 14px;
}

.receiving-badge {
  background: #ff9800;
  color: white;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 14px;
}

.rotation-step {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.volleyball-court {
  position: relative;
  background: linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%);
  border-radius: 12px;
  padding: 20px;
  aspect-ratio: 1 / 0.8;
  border: 3px solid #444466;
  display: flex;
  flex-direction: column;
}

.net-line {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  letter-spacing: 4px;
  padding: 4px 0;
  border-bottom: 2px dashed rgba(255, 255, 255, 0.2);
  margin-bottom: 10px;
}

.zones {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 10px;
  flex: 1;
}

.zone {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  padding: 8px;
  transition: all 0.3s ease;
  position: relative;
}

.front-zone {
  border-bottom: 3px solid rgba(255, 215, 0, 0.3);
}

.back-zone {
  border-top: 3px solid rgba(100, 149, 237, 0.3);
}

.zone.occupied {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.zone.libero-zone {
  border-color: #ff9800;
  background: rgba(255, 152, 0, 0.15);
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.1);
}

.zone.serving-zone {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.1);
}

.zone-number {
  position: absolute;
  top: 4px;
  right: 8px;
  color: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  font-weight: bold;
}

.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: white;
  position: relative;
  width: 100%;
}

.player-number {
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
}

.player-name {
  font-size: 12px;
  opacity: 0.9;
  text-align: center;
  line-height: 1.2;
}

.player-position {
  font-size: 10px;
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 8px;
  border-radius: 10px;
}

.libero-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ff9800;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.3);
}

.serving-arrow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  color: #4caf50;
  font-size: 20px;
  animation: bounce 0.5s ease infinite alternate;
}

.empty-zone {
  color: rgba(255, 255, 255, 0.1);
  font-size: 24px;
}

.rotation-info {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

.serving-text {
  color: #4caf50;
}

.receiving-text {
  color: #ff9800;
}

@keyframes bounce {
  from {
    transform: translateX(-50%) translateY(0);
  }
  to {
    transform: translateX(-50%) translateY(-6px);
  }
}

@media (max-width: 768px) {
  .zone {
    min-height: 60px;
    padding: 4px;
  }

  .player-number {
    font-size: 16px;
  }

  .player-name {
    font-size: 10px;
  }
}
</style>
