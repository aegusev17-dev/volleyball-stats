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
      <SetupView v-if="currentTab === 'Игроки и состав'" />

      <MatchView v-else-if="currentTab === 'Матч'" />

      <Statistics v-else-if="currentTab === 'Статистика'" />

      <MatchHistory
        v-else-if="currentTab === 'История матчей'"
        @match-loaded="currentTab = 'Матч'"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

import SetupView from './components/SetupView.vue'
import MatchView from './components/MatchView.vue'
import Statistics from './components/Statistics.vue'
import MatchHistory from './components/MatchHistory.vue'

const tabs = ['Игроки и состав', 'Матч', 'Статистика', 'История матчей']

const currentTab = ref('Игроки и состав')
</script>

<style>
#app {
  font-family: 'Segoe UI', sans-serif;
  max-width: 1400px;
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
