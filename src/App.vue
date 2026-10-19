
<template>
  <div id="app">
    <h1>🏐 Волейбольная статистика</h1>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="currentTab = tab"
        :class="{ active: currentTab === tab }"
      >
        {{ tab }}
      </button>
    </div>

    <div class="tab-content">
      <TeamSetup
        v-if="currentTab === 'Игроки'"
      />

      <LineupManager
        v-else-if="currentTab === 'Состав'"
      />

      <LineupStorage
        v-else-if="currentTab === 'Сохранения'"
      />

      <MatchControls
        v-else-if="currentTab === 'Матч'"
      />

      <CourtView
        v-else-if="currentTab === 'Площадка'"
      />

      <Scoreboard
        v-else-if="currentTab === 'Запись'"
      />

      <Statistics
        v-else-if="currentTab === 'Статистика'"
      />

      <MatchHistory
        v-else-if="currentTab === 'История матчей'"
        @match-loaded="currentTab = 'Матч'"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

import TeamSetup from './components/TeamSetup.vue'
import LineupManager from './components/LineupManager.vue'
import LineupStorage from './components/LineupStorage.vue'
import MatchControls from './components/MatchControls.vue'
import CourtView from './components/CourtView.vue'
import Scoreboard from './components/Scoreboard.vue'
import Statistics from './components/Statistics.vue'
import MatchHistory from './components/MatchHistory.vue'

const tabs = [
  'Игроки',
  'Состав',
  'Сохранения',
  'Матч',
  'Площадка',
  'Запись',
  'Статистика',
  'История матчей'
]

const currentTab = ref('Игроки')
</script>

<style>
#app {
  font-family: 'Segoe UI', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
  flex-wrap: wrap;
}

.tabs button {
  padding: 10px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  border-radius: 6px;
  transition: all 0.3s;
}

.tabs button:hover {
  background: #f0f0f0;
}

.tabs button.active {
  background: #667eea;
  color: white;
}

.tab-content {
  margin-top: 20px;
}
</style>


<!-- <template>
  <div id="app">
    <h1>🏐 Волейбольная статистика</h1>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="currentTab = tab"
        :class="{ active: currentTab === tab }"
      >
        {{ tab }}
      </button>
    </div>

    <div class="tab-content">
      <TeamSetup v-if="currentTab === 'Игроки'" />
      <LineupManager v-else-if="currentTab === 'Состав'" />
      <LineupStorage v-else-if="currentTab === 'Сохранения'" />
      <MatchControls v-else-if="currentTab === 'Матч'" />
      <CourtView v-else-if="currentTab === 'Площадка'" />
      <Scoreboard v-else-if="currentTab === 'Запись'" />
      <Statistics v-else-if="currentTab === 'Статистика'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TeamSetup from './components/TeamSetup.vue'
import LineupManager from './components/LineupManager.vue'
import LineupStorage from './components/LineupStorage.vue'
import MatchControls from './components/MatchControls.vue'
import CourtView from './components/CourtView.vue'
import Scoreboard from './components/Scoreboard.vue'
import Statistics from './components/Statistics.vue'

const tabs = ['Игроки', 'Состав', 'Сохранения', 'Матч', 'Площадка', 'Запись', 'Статистика']
const currentTab = ref('Игроки')
</script>

<style>
#app {
  font-family: 'Segoe UI', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
  flex-wrap: wrap;
}

.tabs button {
  padding: 10px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  border-radius: 6px;
  transition: all 0.3s;
}

.tabs button:hover {
  background: #f0f0f0;
}

.tabs button.active {
  background: #667eea;
  color: white;
}

.tab-content {
  margin-top: 20px;
}
</style> -->
