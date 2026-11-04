<template>
  <div class="setup-view">
    <details class="setup-section" open>
      <summary>👥 Игроки</summary>
      <TeamSetup />
    </details>

    <details class="setup-section" open>
      <summary>📋 Состав</summary>
      <LineupManager />
    </details>

    <details class="setup-section">
      <summary>💾 Сохранения составов</summary>
      <LineupStorage />
    </details>
  </div>
</template>

<script setup>
import TeamSetup from './TeamSetup.vue'
import LineupManager from './LineupManager.vue'
import LineupStorage from './LineupStorage.vue'
</script>

<style scoped>
.setup-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup-section {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0 8px 8px;
}

.setup-section > summary {
  cursor: pointer;
  padding: 14px 12px;
  font-size: 18px;
  font-weight: 700;
  color: #333;
  list-style: none;
}

.setup-section > summary::-webkit-details-marker {
  display: none;
}

.setup-section > summary::before {
  content: '▾';
  display: inline-block;
  width: 1.2em;
  color: #667eea;
}

.setup-section:not([open]) > summary::before {
  content: '▸';
}
</style>
