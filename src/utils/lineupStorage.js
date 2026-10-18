// ============================================================
// МОДУЛЬ УПРАВЛЕНИЯ СОХРАНЕННЫМИ СОСТАВАМИ
// ============================================================

const STORAGE_KEY = 'volleyball_lineups'
const AUTO_SAVE_KEY = 'volleyball_current_lineup'

// === КОНСТАНТЫ АМПЛУА ===
export const POSITIONS = {
  OH: 'Доигровщик',
  MB: 'Центральный блокирующий',
  OPP: 'Диагональный',
  S: 'Связующий',
  L: 'Либеро'
}

// === ПОЛУЧИТЬ ВСЕ СОХРАНЕННЫЕ СОСТАВЫ ===
export function getSavedLineups() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.warn('Ошибка загрузки составов:', error)
    return []
  }
}

// === СОХРАНИТЬ СОСТАВ ===
export function saveLineup(lineupData) {
  try {
    const lineups = getSavedLineups()

    const existingIndex = lineups.findIndex(l => l.name === lineupData.name)

    const newLineup = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      ...lineupData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (existingIndex !== -1) {
      lineups[existingIndex] = { ...lineups[existingIndex], ...newLineup }
    } else {
      lineups.push(newLineup)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(lineups))
    return newLineup
  } catch (error) {
    console.warn('Ошибка сохранения состава:', error)
    return null
  }
}

// === ЗАГРУЗИТЬ СОСТАВ ===
export function loadLineup(id) {
  try {
    const lineups = getSavedLineups()
    return lineups.find(l => l.id === id) || null
  } catch (error) {
    console.warn('Ошибка загрузки состава:', error)
    return null
  }
}

// === УДАЛИТЬ СОСТАВ ===
export function deleteLineup(id) {
  try {
    const lineups = getSavedLineups()
    const filtered = lineups.filter(l => l.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.warn('Ошибка удаления состава:', error)
    return false
  }
}

// === АВТОСОХРАНЕНИЕ ===
export function autoSaveCurrentLineup(teamData) {
  try {
    const data = {
      teamName: teamData.name || 'Моя команда',
      players: teamData.players.map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
        position: p.position,
        positionName: p.positionName,
        alternativePosition: p.alternativePosition || null,
        alternativePositionName: p.alternativePositionName || null
      })),
      lineup: teamData.lineup.map(p => p?.id || null),
      liberoId: teamData.libero?.id || null,
      currentRotation: teamData.currentRotation.map(p => p?.id || null),
      rotationStep: teamData.rotationStep || 0,
      isLiberoOnCourt: teamData.isLiberoOnCourt || false,
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.warn('Ошибка автосохранения:', error)
    return false
  }
}

// === ЗАГРУЗИТЬ АВТОСОХРАНЕНИЕ ===
export function loadAutoSave() {
  try {
    const data = localStorage.getItem(AUTO_SAVE_KEY)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.warn('Ошибка загрузки автосохранения:', error)
    return null
  }
}

// === ПРОВЕРИТЬ НАЛИЧИЕ АВТОСОХРАНЕНИЯ ===
export function hasAutoSave() {
  return localStorage.getItem(AUTO_SAVE_KEY) !== null
}

// === СОЗДАТЬ СТАНДАРТНЫЙ ШАБЛОН ===
export function createDefaultLineup(teamName = 'Моя команда') {
  const defaultPlayers = [
    { name: 'Иванов', number: 1, position: 'OH' },
    { name: 'Петров', number: 2, position: 'MB' },
    { name: 'Сидоров', number: 3, position: 'S' },
    { name: 'Козлов', number: 4, position: 'OH' },
    { name: 'Морозов', number: 5, position: 'MB' },
    { name: 'Волков', number: 6, position: 'OPP' },
    { name: 'Соколов', number: 7, position: 'L' }
  ]

  const extraPlayers = [
    { name: 'Тест1 (OH)', number: 8, position: 'OH' },
    { name: 'Тест2 (MB)', number: 9, position: 'MB' },
    { name: 'Тест3 (S)', number: 10, position: 'S' },
    { name: 'Тест4 (OPP)', number: 11, position: 'OPP' },
    { name: 'Тест5 (L)', number: 12, position: 'L' }
  ]

  const allPlayers = [...defaultPlayers, ...extraPlayers]

  return {
    name: `Шаблон ${new Date().toLocaleDateString()}`,
    teamName: teamName,
    players: allPlayers,
    lineup: allPlayers.slice(0, 6).map(p => p.id),
    liberoId: allPlayers.find(p => p.position === 'L')?.id || null
  }
}

// === ЭКСПОРТ ===
export function exportLineup(id) {
  const lineup = loadLineup(id)
  if (!lineup) return null

  const blob = new Blob([JSON.stringify(lineup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `lineup_${lineup.name.replace(/\s+/g, '_')}.json`
  link.click()
  URL.revokeObjectURL(url)
  return true
}

// === ИМПОРТ ===
export function importLineup(jsonData) {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

    if (!data.players || !Array.isArray(data.players)) {
      throw new Error('Неверный формат данных')
    }

    return saveLineup(data)
  } catch (error) {
    console.warn('Ошибка импорта состава:', error)
    return null
  }
}
