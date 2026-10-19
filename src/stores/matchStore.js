import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const MATCH_KEY = 'volleyball-match-v1'

// Уникальный числовой id. Date.now() + Math.random() давал одинаковые id
// у игроков, созданных в одну миллисекунду (не хватает точности float).
let idSeq = 0
function newId() {
  idSeq = (idSeq + 1) % 1000
  return Date.now() * 1000 + idSeq
}

function createDefaultTeam() {
  return {
    name: 'Моя команда',
    opponentName: 'Соперник',
    players: [],
    lineup: [],
    currentRotation: [],
    libero: null,
    liberoReplacedId: null, // кого именно заменил либеро на площадке
    isLiberoOnCourt: false,
    isServing: false,
    timeouts: 0,
    substitutions: 0,
    opponentAces: 0,
    currentSet: 1,
    rotationStep: 0,
    isMatchActive: false,
    isOurServe: true,
    startingPositions: {},
    setServing: {}
  }
}

export const useMatchStore = defineStore('match', () => {
  // === Состояние ===
  const team = ref(createDefaultTeam())

  const events = ref([])
  const currentRally = ref({
    actions: [],
    score: { home: 0, away: 0 },
    setNumber: 1,
    isActive: false,
    isServing: false
  })

  const POSITIONS = {
    OH: 'Доигровщик',
    MB: 'Центральный блокирующий',
    OPP: 'Диагональный',
    S: 'Связующий',
    L: 'Либеро'
  }

  let eventOrder = 0
  let rallyCounter = 0


let pendingRallySnapshot = null

// Снимок состояния до первого действия розыгрыша
function captureRallySnapshot() {
  return {
    eventsLength: events.value.length,
    eventOrder,
    rallyCounter,

    currentRally: {
      score: { ...currentRally.value.score },
      setNumber: currentRally.value.setNumber,
      isActive: currentRally.value.isActive,
      isServing: currentRally.value.isServing
    },

    team: {
      isServing: team.value.isServing,
      isOurServe: team.value.isOurServe,
      rotationStep: team.value.rotationStep,
      isMatchActive: team.value.isMatchActive,
      isLiberoOnCourt: team.value.isLiberoOnCourt,
      liberoReplacedId: team.value.liberoReplacedId,
      timeouts: team.value.timeouts,
      substitutions: team.value.substitutions,
      opponentAces: team.value.opponentAces,
      currentSet: team.value.currentSet,
      startingPositions: JSON.parse(JSON.stringify(team.value.startingPositions || {})),
      setServing: JSON.parse(JSON.stringify(team.value.setServing || {})),
      lineupIds: team.value.lineup.map(p => p?.id ?? null),
      rotationIds: team.value.currentRotation.map(p => p?.id ?? null)
    },

    playerStats: team.value.players.map(player => ({
      id: player.id,
      stats: JSON.parse(JSON.stringify(player.stats))
    }))
  }
}

// Восстановление состояния до розыгрыша
function undoLastRally() {
  const lastRallyIndex = events.value.findLastIndex(
    event => event.type === 'rally'
  )

  if (lastRallyIndex === -1) return false

  const lastRally = events.value[lastRallyIndex]
  const snapshot = lastRally.undoSnapshot

  // Старые записи не содержат снимка состояния
  if (!snapshot) {
    console.warn(
      'Нельзя безопасно отменить этот розыгрыш: отсутствует снимок состояния.'
    )
    return false
  }

  // Удаляем розыгрыш и все события, появившиеся после начала розыгрыша
  events.value.splice(snapshot.eventsLength)

  // Восстанавливаем статистику игроков
  snapshot.playerStats.forEach(savedPlayer => {
    const player = team.value.players.find(p => p.id === savedPlayer.id)
    if (player) {
      player.stats = JSON.parse(JSON.stringify(savedPlayer.stats))
    }
  })

  // Восстанавливаем состояние команды
  Object.assign(team.value, {
    isServing: snapshot.team.isServing,
    isOurServe: snapshot.team.isOurServe,
    rotationStep: snapshot.team.rotationStep,
    isMatchActive: snapshot.team.isMatchActive,
    isLiberoOnCourt: snapshot.team.isLiberoOnCourt,
    liberoReplacedId: snapshot.team.liberoReplacedId,
    timeouts: snapshot.team.timeouts,
    substitutions: snapshot.team.substitutions,
    opponentAces: snapshot.team.opponentAces,
    currentSet: snapshot.team.currentSet,
    startingPositions: JSON.parse(
      JSON.stringify(snapshot.team.startingPositions)
    ),
    setServing: JSON.parse(
      JSON.stringify(snapshot.team.setServing)
    ),
    lineup: snapshot.team.lineupIds.map(
      id => team.value.players.find(p => p.id === id) || null
    ),
    currentRotation: snapshot.team.rotationIds.map(
      id => team.value.players.find(p => p.id === id) || null
    )
  })

  // Возвращаемся к счёту до отменённого розыгрыша
  currentRally.value = {
    ...snapshot.currentRally,
    score: { ...snapshot.currentRally.score },
    actions: []
  }

  eventOrder = snapshot.eventOrder
  rallyCounter = snapshot.rallyCounter
  pendingRallySnapshot = null

  saveMatch()
  return true
}


  // === ДОБАВЛЕНИЕ ИГРОКА ===
  function addPlayer(name, number, position = '', altPosition = '') {
    team.value.players.push({
      id: newId(),
      name,
      number,
      position,
      positionName: POSITIONS[position] || '',
      alternativePosition: altPosition,
      alternativePositionName: POSITIONS[altPosition] || '',
      stats: {
        attacks: { total: 0, kills: 0, errors: 0, digs: 0 },
        serves: { total: 0, aces: 0, errors: 0 },
        blocks: { total: 0, points: 0, errors: 0 },
        receptions: { total: 0, positive: 0, perfect: 0, errors: 0 },
        sets: { total: 0, assists: 0 },
        substitutions: { in: 0, out: 0 }
      }
    })
  }

  // === УСТАНОВКА СОСТАВА ===
  function setLineup(lineupArray) {
    team.value.lineup = lineupArray.filter(p => p)
    team.value.currentRotation = [...team.value.lineup]
    team.value.isServing = true
    team.value.rotationStep = 0
    team.value.isMatchActive = false
    team.value.isLiberoOnCourt = false
  }

  // === НАЗНАЧЕНИЕ ЛИБЕРО ===
  function setLibero(playerId) {
    const player = team.value.players.find(p => p.id === playerId)
    if (player) {
      if (player.position !== 'L') {
        console.warn(`⚠️ Игрок ${player.name} не может быть либеро`)
        return
      }
      player.position = 'L'
      player.positionName = POSITIONS.L
      team.value.libero = player
      team.value.isLiberoOnCourt = false
      team.value.currentRotation = [...team.value.lineup]
    }
  }

  // === ЗАМЕНА (полевой игрок) ===
  function substitute(playerInId, playerOutId) {
    if (!team.value.isMatchActive) return

    const playerIn = team.value.players.find(p => p.id === playerInId)
    const playerOut = team.value.players.find(p => p.id === playerOutId)

    if (playerIn && playerOut) {
      const idx = team.value.currentRotation.findIndex(p => p && p.id === playerOut.id)
      if (idx !== -1) {
        // Если заменили самого либеро — он больше не на площадке
        if (team.value.libero && playerOut.id === team.value.libero.id) {
          team.value.isLiberoOnCourt = false
          team.value.liberoReplacedId = null
        }
        team.value.currentRotation[idx] = playerIn
        team.value.substitutions++
        playerIn.stats.substitutions.in++
        playerOut.stats.substitutions.out++
        addSubstitutionEvent(playerIn, playerOut)
        applyLiberoRules(true, false)
      }
    }
  }

  // === ЛИБЕРО ВХОДИТ (вручную) ===
  function liberoIn(playerOutId) {
    if (!team.value.isMatchActive) return
    if (!team.value.libero) return
    if (isLiberoInRotation()) return

    const rotation = team.value.currentRotation
    const idx = rotation.findIndex(p => p && p.id === playerOutId)
    if (idx === -1) return

    const zone = idx + 1
    if ([2, 3, 4].includes(zone)) {
      console.warn('⚠️ Либеро нельзя выпускать на игрока передней линии')
      return
    }
    if (zone === 1 && team.value.isServing) {
      console.warn('⚠️ Либеро не может подавать')
      return
    }

    const playerOut = rotation[idx]
    rotation[idx] = team.value.libero
    team.value.liberoReplacedId = playerOut.id
    team.value.isLiberoOnCourt = true
    team.value.currentRotation = [...rotation]
    addLiberoEvent('in', playerOut, false)
  }

  // === ЛИБЕРО ВЫХОДИТ (вручную) ===
  function liberoOut() {
    if (!team.value.isMatchActive) return
    if (!team.value.libero) return

    const rotation = [...team.value.currentRotation]
    const idx = rotation.findIndex(p => p && p.id === team.value.libero.id)
    if (idx === -1) {
      team.value.isLiberoOnCourt = false
      return
    }

    const returned = takeLiberoOff(rotation, idx)
    if (returned) {
      team.value.currentRotation = rotation
      addLiberoEvent('out', returned, false)
    }
  }

  // === ТАЙМ-АУТ ===
  function callTimeout() {
    if (!team.value.isMatchActive) return
    team.value.timeouts++
    addTimeoutEvent()
  }

  // === СОБЫТИЕ: ЗАМЕНА ЛИБЕРО ===
  function addLiberoEvent(direction, replacedPlayer, isPreRally = false) {
    const libero = team.value.libero
    if (!libero) return

    eventOrder++
    const orderValue = isPreRally ? eventOrder - 0.5 : eventOrder

    const event = {
      id: newId(),
      order: orderValue,
      type: 'libero',
      direction: direction,
      player: { ...libero },
      replacedPlayer: replacedPlayer ? { ...replacedPlayer } : null,
      timestamp: Date.now(),
      setNumber: currentRally.value.setNumber,
      score: { home: currentRally.value.score.home, away: currentRally.value.score.away },
      isPreRally: isPreRally
    }
    events.value.push(event)
  }

  // === СОБЫТИЕ: ЗАМЕНА ИГРОКА ===
  function addSubstitutionEvent(playerIn, playerOut) {
    eventOrder++
    events.value.push({
      id: newId(),
      order: eventOrder,
      type: 'substitution',
      playerIn: { ...playerIn },
      playerOut: { ...playerOut },
      timestamp: Date.now(),
      setNumber: currentRally.value.setNumber,
      score: { home: currentRally.value.score.home, away: currentRally.value.score.away }
    })
  }

  // === СОБЫТИЕ: ТАЙМ-АУТ ===
  function addTimeoutEvent() {
    eventOrder++
    events.value.push({
      id: newId(),
      order: eventOrder,
      type: 'timeout',
      teamName: team.value.name,
      timestamp: Date.now(),
      setNumber: currentRally.value.setNumber,
      score: { home: currentRally.value.score.home, away: currentRally.value.score.away }
    })
  }

  // === РОТАЦИЯ ===
  function rotateTeam(applyLibero = true) {
    if (!team.value.isMatchActive) return
    if (team.value.currentRotation.length === 0) return

    const rotation = team.value.currentRotation
    const newRotation = Array(6).fill(null)

    newRotation[0] = rotation[1]
    newRotation[1] = rotation[2]
    newRotation[2] = rotation[3]
    newRotation[3] = rotation[4]
    newRotation[4] = rotation[5]
    newRotation[5] = rotation[0]

    team.value.currentRotation = newRotation
    team.value.rotationStep = (team.value.rotationStep + 1) % 6

    if (applyLibero) applyLiberoRules(true, false)
  }

  // Либеро сейчас в ротации? (источник истины — сама ротация, а не флаг)
  function isLiberoInRotation() {
    const lib = team.value.libero
    if (!lib) return false
    return team.value.currentRotation.some(p => p && p.id === lib.id)
  }

  // Кого вернуть вместо либеро: ровно того, кого он заменил.
  // Запасной вариант — центральный, которого нет на площадке.
  function findReplacedMB() {
    const rotation = team.value.currentRotation
    const onCourt = id => rotation.some(p => p && p.id === id)

    const savedId = team.value.liberoReplacedId
    if (savedId != null && !onCourt(savedId)) {
      const saved = team.value.players.find(p => p.id === savedId)
      if (saved) return saved
    }

    for (const player of team.value.players) {
      if (player.position === 'MB' &&
          !onCourt(player.id) &&
          player.id !== team.value.libero?.id) {
        return player
      }
    }
    return null
  }

  // Убирает либеро с позиции idx в переданном массиве rotation (меняет его на месте)
  function takeLiberoOff(rotation, idx) {
    const back = findReplacedMB()
    if (!back) return null
    rotation[idx] = back
    team.value.isLiberoOnCourt = false
    team.value.liberoReplacedId = null
    return back
  }

  function replaceLiberoWithMBInternal() {
    if (!team.value.libero) return null
    const rotation = [...team.value.currentRotation]
    const idx = rotation.findIndex(p => p && p.id === team.value.libero.id)
    if (idx === -1) {
      team.value.isLiberoOnCourt = false
      return null
    }
    const mb = takeLiberoOff(rotation, idx)
    if (mb) team.value.currentRotation = rotation
    return mb
  }

  // === ПРИМЕНЕНИЕ ПРАВИЛ ЛИБЕРО ===
  // 1) Либеро обязан уйти, если оказался у сетки (зоны 2-4)
  //    или на подаче (зона 1 при нашей подаче).
  // 2) Либеро заходит вместо центрального, который стоит в задней линии
  //    (зоны 5, 6, а при приёме — и зона 1). Подающий центральный остаётся.
  function applyLiberoRules(recordEvent = false, isPreRally = false) {
    if (!team.value.isMatchActive) return
    const libero = team.value.libero
    if (!libero) return

    const rotation = [...team.value.currentRotation]
    if (rotation.length === 0) return

    let idx = rotation.findIndex(p => p && p.id === libero.id)
    team.value.isLiberoOnCourt = idx !== -1 // синхронизируем флаг с реальностью

    // 1. Либеро должен выйти
    if (idx !== -1) {
      const zone = idx + 1
      const mustLeave = [2, 3, 4].includes(zone) || (team.value.isServing && zone === 1)
      if (mustLeave) {
        const returned = takeLiberoOff(rotation, idx)
        if (returned) {
          if (recordEvent) addLiberoEvent('out', returned, isPreRally)
          idx = -1
        }
      }
    }

    // 2. Либеро должен войти
    if (idx === -1) {
      const backRowZones = [1, 5, 6]
      const mbIndex = rotation.findIndex((player, i) => {
        if (!player || player.position !== 'MB') return false
        const zone = i + 1
        if (!backRowZones.includes(zone)) return false
        if (zone === 1 && team.value.isServing) return false // подающий остаётся
        return true
      })

      if (mbIndex !== -1) {
        const replaced = rotation[mbIndex]
        rotation[mbIndex] = libero
        team.value.isLiberoOnCourt = true
        team.value.liberoReplacedId = replaced.id
        if (recordEvent) addLiberoEvent('in', replaced, isPreRally)
      }
    }

    team.value.currentRotation = rotation
  }

  // === УСТАНОВИТЬ СТАТУС ПОДАЧИ ===
  function setServing(isServing) {
    team.value.isServing = isServing
    currentRally.value.isServing = isServing

    if (!team.value.isMatchActive) {
      // До начала сета: расстановка меняется молча, без событий
      const rotation = [...team.value.currentRotation]
      const libero = team.value.libero
      if (rotation.length > 0 && libero) {
        const idx = rotation.findIndex(p => p && p.id === libero.id)
        if (isServing && idx !== -1) {
          const back = findReplacedMB()
          if (back) {
            rotation[idx] = back
            team.value.isLiberoOnCourt = false
            team.value.liberoReplacedId = null
          }
        } else if (!isServing && idx === -1) {
          const mbIndex = rotation.findIndex(
            (p, i) => p && p.position === 'MB' && [1, 5, 6].includes(i + 1)
          )
          if (mbIndex !== -1) {
            team.value.liberoReplacedId = rotation[mbIndex].id
            rotation[mbIndex] = libero
            team.value.isLiberoOnCourt = true
          }
        }
        team.value.currentRotation = rotation
      }
      return
    }

    // Матч идёт (ручная коррекция статуса): применяем правила и пишем событие
    applyLiberoRules(true, false)
  }

  // Переключить подачу/приём во время матча
  function toggleServing() {
    setServing(!team.value.isServing)
  }

  // === НАЗВАНИЕ СОПЕРНИКА ===
  function setOpponentName(name) {
    team.value.opponentName = (name || '').trim() || 'Соперник'
  }

  // === НАЧАТЬ СЕТ ===
  function startSet(setNumber, isOurServe) {
    team.value.isMatchActive = true
    team.value.isServing = isOurServe
    team.value.isOurServe = isOurServe
    currentRally.value.isServing = isOurServe
    currentRally.value.isActive = true
    currentRally.value.setNumber = setNumber
    currentRally.value.score = { home: 0, away: 0 }
    currentRally.value.actions = []

    team.value.currentRotation = [...team.value.lineup]
    team.value.rotationStep = 0
    team.value.isLiberoOnCourt = false
    team.value.liberoReplacedId = null
    rallyCounter = 0

    const setPositions = {}
    team.value.currentRotation.forEach((player, index) => {
      if (player) {
        const zone = index + 1
        setPositions[player.id] = zone
      }
    })

    if (team.value.libero) {
      setPositions[team.value.libero.id] = 'L'
    }

    if (!team.value.startingPositions) {
      team.value.startingPositions = {}
    }
    team.value.startingPositions[setNumber] = setPositions

    if (!team.value.setServing) {
      team.value.setServing = {}
    }
    team.value.setServing[setNumber] = isOurServe

    applyLiberoRules(true, true)
  }

  function keepMB() {
    if (!team.value.isMatchActive) return
    if (isLiberoInRotation()) {
      const mbPlayer = replaceLiberoWithMBInternal()
      if (mbPlayer) {
        addLiberoEvent('out', mbPlayer, false)
      }
    }
  }

  function changeSet(newSet) {
    team.value.currentSet = newSet
    team.value.rotationStep = 0
    team.value.isLiberoOnCourt = false
    team.value.liberoReplacedId = null
    team.value.currentRotation = [...team.value.lineup]

    if (newSet <= 4) {
      team.value.isOurServe = newSet % 2 === 1
    } else {
      team.value.isOurServe = true
    }

    team.value.isServing = team.value.isOurServe
    currentRally.value.isServing = team.value.isOurServe
    rallyCounter = 0

    if (team.value.setServing) {
      team.value.setServing[newSet] = team.value.isOurServe
    }

    if (team.value.isMatchActive) {
      applyLiberoRules(true, true)
    }
  }

  function setFifthSetServe(isOurServe) {
    if (team.value.currentSet === 5) {
      team.value.isOurServe = isOurServe
      team.value.isServing = isOurServe
      currentRally.value.isServing = isOurServe
      if (team.value.setServing) {
        team.value.setServing[5] = isOurServe
      }
      if (team.value.isMatchActive) {
        applyLiberoRules(true, true)
      }
    }
  }

  function getRotation() {
    return team.value.currentRotation.map((player, index) => ({
      zone: index + 1,
      player: player,
      isLibero: player?.id === team.value.libero?.id,
      position: player?.positionName || '',
      isServing: index === 0 && team.value.isServing
    }))
  }

  function addAction(actionType, playerId, result = null, targetId = null) {
    if (!team.value.isMatchActive) {
      console.warn('⚠️ Матч не начат!')
      return
    }

    const player = team.value.players.find(p => p.id === playerId)
    if (!player) {
      console.warn('⚠️ Игрок не найден:', playerId)
      return
    }

    if (
    currentRally.value.actions.length === 0 &&
    !pendingRallySnapshot
    ) {
    pendingRallySnapshot = captureRallySnapshot()
    }

    updatePlayerStats(player, actionType, result)

    const action = {
      type: actionType,
      playerId,
      targetId,
      result,
      timestamp: Date.now(),
      setNumber: currentRally.value.setNumber,
      meta: arguments[4] || null
    }

    currentRally.value.actions.push(action)

    if (['kill', 'error', 'ace', 'block_point', 'opponent_error'].includes(result)) {
      endRally(action)
    }
  }

  // === ЭЙС СОПЕРНИКА (подача соперника — очко им, без участия наших игроков) ===
  function addOpponentAce() {
    if (!team.value.isMatchActive) return
    if (team.value.isServing) return // эйс соперника возможен только когда мы принимаем
    if (currentRally.value.actions.length > 0) return // это первое действие розыгрыша
    if (!pendingRallySnapshot) {
    pendingRallySnapshot = captureRallySnapshot()
    }
    team.value.opponentAces = (team.value.opponentAces || 0) + 1

    const action = {
      type: 'opponent_serve',
      playerId: null,
      targetId: null,
      result: 'opponent_ace',
      timestamp: Date.now(),
      setNumber: currentRally.value.setNumber,
      meta: { originalResult: 'Эйс' }
    }
    currentRally.value.actions.push(action)
    endRally(action)
  }

  function updatePlayerStats(player, actionType, result) {
    const stats = player.stats

    switch (actionType) {
      case 'serve':
        stats.serves.total++
        if (result === 'ace') stats.serves.aces++
        if (result === 'error') stats.serves.errors++
        break
      case 'attack':
        stats.attacks.total++
        if (result === 'kill') stats.attacks.kills++
        if (result === 'error') stats.attacks.errors++
        break
      case 'block':
        stats.blocks.total++
        if (result === 'block_point') stats.blocks.points++
        if (result === 'error') stats.blocks.errors++
        break
      case 'reception':
        stats.receptions.total++
        if (result === 'perfect' || result === 'good_dig') stats.receptions.perfect++
        if (result === 'positive') stats.receptions.positive++
        if (result === 'error') stats.receptions.errors++
        break
      case 'dig':
        stats.receptions.total++
        if (result === 'good_dig') {
          stats.receptions.perfect++
        } else if (result === 'error') {
          stats.receptions.errors++
        } else if (result === 'continue') {
          stats.receptions.positive++
        }
        break
      case 'set':
        stats.sets.total++
        if (result === 'assist') stats.sets.assists++
        break
    }
  }

  // === ПРОВЕРКА ЗАВЕРШЕНИЯ ПАРТИИ ===
  function checkSetFinished(homeScore, awayScore, setNumber) {
    const targetScore = setNumber === 5 ? 15 : 25

    if (homeScore >= targetScore || awayScore >= targetScore) {
      const diff = Math.abs(homeScore - awayScore)
      if (diff >= 2) {
        return true
      }
      return false
    }
    return false
  }

  // === ЗАВЕРШЕНИЕ РОЗЫГРЫША ===
  function endRally(action) {
    const rally = currentRally.value
    let isPointWon = false

    if (['kill', 'ace', 'block_point', 'opponent_error'].includes(action.result)) {
      isPointWon = true
    } else if (action.result === 'error') {
      isPointWon = false
    }

    // Обновляем счет
    let needRotate = false
    if (isPointWon) {
      rally.score.home += 1
      // Выиграли на приёме — переходим на подачу с ротацией.
      // Выиграли на своей подаче — ротации нет.
      needRotate = !team.value.isServing
    } else {
      rally.score.away += 1
    }

    // Сохраняем розыгрыш в историю СРАЗУ, до ротации и замен либеро:
    // тогда события либеро (которые вызваны этим розыгрышем) идут ПОСЛЕ него
    rallyCounter++
    const currentRallyNumber = rallyCounter

    eventOrder++
    events.value.push({
    id: newId(),
    order: eventOrder,
    type: 'rally',
    rallyNumber: currentRallyNumber,
    setNumber: rally.setNumber,
    score: { home: rally.score.home, away: rally.score.away },
    actions: [...rally.actions],
    isPointWon: isPointWon,
    undoSnapshot: pendingRallySnapshot
    })

    // Меняем подачу и ротируем ДО применения правил либеро,
    // чтобы правила считались уже для новой ситуации (подаем / принимаем)
    if (isPointWon) {
      if (needRotate) {
        team.value.isServing = true
        currentRally.value.isServing = true
        rotateTeam(false)
      }
    } else if (team.value.isServing) {
      team.value.isServing = false
      currentRally.value.isServing = false
    }

    // === ПРОВЕРКА ЗАВЕРШЕНИЯ ПАРТИИ ===
    const isSetFinished = checkSetFinished(rally.score.home, rally.score.away, rally.setNumber)

    if (isSetFinished) {
      // Партия завершена
      team.value.isMatchActive = false
      currentRally.value.isActive = false

      // Определяем победителя партии
      const setWinner = rally.score.home > rally.score.away ? 'home' : 'away'

      // Добавляем событие о завершении партии
      eventOrder++
      events.value.push({
        id: newId(),
        order: eventOrder,
        type: 'set_finished',
        setNumber: rally.setNumber,
        score: { home: rally.score.home, away: rally.score.away },
        winner: setWinner,
        timestamp: Date.now()
      })

      // === ПРОВЕРКА ЗАВЕРШЕНИЯ МАТЧА ===
      // Считаем количество выигранных партий каждой командой
      const setsWon = { home: 0, away: 0 }
      events.value.forEach(e => {
        if (e.type === 'set_finished') {
          if (e.winner === 'home') setsWon.home++
          if (e.winner === 'away') setsWon.away++
        }
      })

      // Матч завершен, если одна команда выиграла 3 партии
      const isMatchFinished = setsWon.home >= 3 || setsWon.away >= 3

      if (isMatchFinished) {
        // Матч завершен
        events.value.push({
          id: newId(),
          order: eventOrder + 1,
          type: 'match_finished',
          score: { home: setsWon.home, away: setsWon.away },
          winner: setsWon.home >= 3 ? 'home' : 'away',
          timestamp: Date.now()
        })
        // Матч полностью остановлен
        team.value.isMatchActive = false
        currentRally.value.isActive = false
        pendingRallySnapshot = null
        return
      }

      // === ПОДГОТОВКА К СЛЕДУЮЩЕЙ ПАРТИИ ===
      // Если матч не завершен, переходим к следующей партии
      const nextSet = rally.setNumber + 1

      // Определяем, кто подает в следующей партии
      // По правилам: в 1-й партии жребий, дальше чередование
      // Для следующей партии подает команда, которая НЕ подавала в предыдущей
      const previousServing = team.value.setServing?.[rally.setNumber]
      const isOurServe = previousServing !== undefined ? !previousServing : (nextSet % 2 === 1)

      if (!team.value.setServing) {
        team.value.setServing = {}
      }
      team.value.setServing[nextSet] = isOurServe

      // Сбрасываем состояние для новой партии
      currentRally.value = {
        actions: [],
        score: { home: 0, away: 0 },
        setNumber: nextSet,
        isActive: false,
        isServing: isOurServe
      }
      team.value.currentSet = nextSet
      team.value.isServing = isOurServe
      team.value.isMatchActive = false

    } else {
      // Партия продолжается
      applyLiberoRules(true, false)

      currentRally.value = {
        actions: [],
        score: { ...rally.score },
        setNumber: rally.setNumber,
        isActive: true,
        isServing: team.value.isServing
      }
      pendingRallySnapshot = null
    }
  }

  function getPlayerStats(player) {
    const s = player.stats || {}
    const attacks = s.attacks || { total: 0, kills: 0, errors: 0 }
    const serves = s.serves || { total: 0, aces: 0, errors: 0 }
    const blocks = s.blocks || { total: 0, points: 0, errors: 0 }
    const receptions = s.receptions || { total: 0, perfect: 0, positive: 0, errors: 0 }

    const points = (attacks.kills || 0) + (serves.aces || 0) + (blocks.points || 0)
    const receptionEfficiency = (receptions.perfect || 0) + (receptions.positive || 0) - (receptions.errors || 0)
    const receptionPercent = receptions.total > 0
      ? Math.round(((receptions.perfect + receptions.positive) / receptions.total) * 100)
      : 0
    const attackEfficiency = attacks.total > 0
      ? Math.round(((attacks.kills - attacks.errors) / attacks.total) * 100)
      : 0
    const attackErrorPercent = attacks.total > 0
      ? Math.round((attacks.errors / attacks.total) * 100)
      : 0

    return {
      points,
      serves: { ...serves },
      receptions: {
        ...receptions,
        efficiency: receptionEfficiency,
        percent: receptionPercent
      },
      attacks: {
        ...attacks,
        efficiency: attackEfficiency,
        errorPercent: attackErrorPercent
      },
      blocks: { ...blocks }
    }
  }

  function getTeamStats() {
    const players = team.value.players || []
    let total = {
      points: 0,
      serves: { total: 0, aces: 0, errors: 0 },
      receptions: { total: 0, perfect: 0, positive: 0, errors: 0 },
      attacks: { total: 0, kills: 0, errors: 0 },
      blocks: { total: 0, points: 0, errors: 0 }
    }

    players.forEach(p => {
      const stats = getPlayerStats(p)
      total.points += stats.points
      total.serves.total += stats.serves.total
      total.serves.aces += stats.serves.aces
      total.serves.errors += stats.serves.errors
      total.receptions.total += stats.receptions.total
      total.receptions.perfect += stats.receptions.perfect
      total.receptions.positive += stats.receptions.positive
      total.receptions.errors += stats.receptions.errors
      total.attacks.total += stats.attacks.total
      total.attacks.kills += stats.attacks.kills
      total.attacks.errors += stats.attacks.errors
      total.blocks.total += stats.blocks.total
      total.blocks.points += stats.blocks.points
      total.blocks.errors += stats.blocks.errors
    })

    const receptionEfficiency = (total.receptions.perfect + total.receptions.positive) - total.receptions.errors
    const receptionPercent = total.receptions.total > 0
      ? Math.round(((total.receptions.perfect + total.receptions.positive) / total.receptions.total) * 100)
      : 0
    const attackEfficiency = total.attacks.total > 0
      ? Math.round(((total.attacks.kills - total.attacks.errors) / total.attacks.total) * 100)
      : 0
    const attackErrorPercent = total.attacks.total > 0
      ? Math.round((total.attacks.errors / total.attacks.total) * 100)
      : 0

    return {
      ...total,
      receptionEfficiency,
      receptionPercent,
      attackEfficiency,
      attackErrorPercent
    }
  }

  function resetMatch() {
    events.value = []
    currentRally.value = {
      actions: [],
      score: { home: 0, away: 0 },
      setNumber: 1,
      isActive: false,
      isServing: false
    }
    team.value.players.forEach(p => resetPlayerStats(p))
    team.value.timeouts = 0
    team.value.substitutions = 0
    team.value.opponentAces = 0
    team.value.isServing = false
    team.value.isLiberoOnCourt = false
    team.value.liberoReplacedId = null
    team.value.rotationStep = 0
    team.value.isMatchActive = false
    team.value.isOurServe = true
    team.value.currentRotation = [...team.value.lineup]
    team.value.startingPositions = {}
    team.value.setServing = {}
    eventOrder = 0
    rallyCounter = 0
    clearSavedMatch()
  }

  function resetPlayerStats(player) {
    player.stats = {
      attacks: { total: 0, kills: 0, errors: 0, digs: 0 },
      serves: { total: 0, aces: 0, errors: 0 },
      blocks: { total: 0, points: 0, errors: 0 },
      receptions: { total: 0, positive: 0, perfect: 0, errors: 0 },
      sets: { total: 0, assists: 0 },
      substitutions: { in: 0, out: 0 }
    }
  }

  // === СОХРАНЕНИЕ МАТЧА ===
  // Игроки в хранилище сравниваются по ссылке, поэтому в JSON кладём только id,
  // а при загрузке собираем ссылки на объекты из team.players.
  function serializeMatch() {
    const t = team.value
    const ids = arr => arr.map(p => (p ? p.id : null))
    return {
      version: 1,
      savedAt: Date.now(),
      eventOrder,
      rallyCounter,
      events: events.value,
      currentRally: currentRally.value,
      team: {
        ...t,
        lineup: ids(t.lineup),
        currentRotation: ids(t.currentRotation),
        libero: t.libero ? t.libero.id : null
      }
    }
  }

  function saveMatch() {
    try {
      localStorage.setItem(MATCH_KEY, JSON.stringify(serializeMatch()))
    } catch (e) {
      console.warn('Не удалось сохранить матч:', e)
    }
  }

  function restoreMatch(data) {
    if (!data || data.version !== 1 || !data.team) return false

    const players = data.team.players || []
    const byId = new Map(players.map(p => [p.id, p]))
    const pick = id => (id == null ? null : byId.get(id) ?? null)

    team.value = {
      ...createDefaultTeam(),
      ...data.team,
      lineup: (data.team.lineup || []).map(pick).filter(Boolean),
      currentRotation: (data.team.currentRotation || []).map(pick),
      libero: pick(data.team.libero)
    }
    events.value = data.events || []
    if (data.currentRally) currentRally.value = data.currentRally
    eventOrder = data.eventOrder || 0
    rallyCounter = data.rallyCounter || 0
    return true
  }

  function loadSavedMatch() {
    try {
      const raw = localStorage.getItem(MATCH_KEY)
      return raw ? restoreMatch(JSON.parse(raw)) : false
    } catch (e) {
      console.warn('Сохранённый матч повреждён:', e)
      return false
    }
  }

  function clearSavedMatch() {
    try {
      localStorage.removeItem(MATCH_KEY)
    } catch (e) {
      console.warn(e)
    }
  }

  // Резервная копия файлом
  function exportMatch() {
    return JSON.stringify(serializeMatch(), null, 2)
  }

  function importMatch(json) {
    try {
      return restoreMatch(JSON.parse(json))
    } catch {
      return false
    }
  }

  // Загружаем при старте и сохраняем автоматически (с задержкой 300 мс)
  loadSavedMatch()

  let saveTimer = null
  watch(
    [team, events, currentRally],
    () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(saveMatch, 300)
    },
    { deep: true }
  )

  return {
    team,
    events,
    currentRally,
    POSITIONS,
    addPlayer,
    setLineup,
    setLibero,
    substitute,
    liberoIn,
    liberoOut,
    callTimeout,
    rotateTeam,
    keepMB,
    changeSet,
    setFifthSetServe,
    addAction,
    undoLastRally,
    resetMatch,
    getRotation,
    setServing,
    applyLiberoRules,
    replaceLiberoWithMBInternal,
    startSet,
    addLiberoEvent,
    addSubstitutionEvent,
    addTimeoutEvent,
    getPlayerStats,
    getTeamStats,
    toggleServing,
    setOpponentName,
    addOpponentAce,
    saveMatch,
    loadSavedMatch,
    clearSavedMatch,
    exportMatch,
    importMatch
  }
})
