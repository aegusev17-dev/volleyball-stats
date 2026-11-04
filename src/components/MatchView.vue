<template>
  <div class="match-view">
    <aside class="match-side">
      <MatchControls />
      <CourtView />
    </aside>

    <main class="match-main">
      <Scoreboard />
    </main>
  </div>
</template>

<script setup>
import MatchControls from './MatchControls.vue'
import CourtView from './CourtView.vue'
import Scoreboard from './Scoreboard.vue'
</script>

<style scoped>
.match-view {
  display: grid;
  grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.match-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.match-side > * {
  min-width: 0;
}

.match-main {
  min-width: 0;
}

/* Узкий экран: площадка и управление сверху, запись под ними */
@media (max-width: 1000px) {
  .match-view {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
