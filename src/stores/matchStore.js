import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMatchStore = defineStore('match', () => {
  // === Состояние ===
  const team = ref({
    name: 'Моя команда',
    players: [],
    lineup: [],
    currentRotation: [],
    libero: null,
    isLiberoOnCourt: false,
    isServing: false,
    timeouts: 0,
    substitutions: 0,
    currentSet: 1,
    rotationStep: 0,
    isMatchActive: false,
    isOurServe: true,
    startingPositions: {},
    setServing: {}
  })

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

  // === ДОБАВЛЕНИЕ ИГРОКА ===
  function addPlayer(name, number, position = '', altPosition = '') {
    team.value.players.push({
      id: Date.now() + Math.random(),
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
      const idx = team.value.currentRotation.indexOf(playerOut)
      if (idx !== -1) {
        team.value.currentRotation[idx] = playerIn
        team.value.substitutions++
        playerIn.stats.substitutions.in++
        playerOut.stats.substitutions.out++
        addSubstitutionEvent(playerIn, playerOut)
        applyLiberoRules(true, false)
      }
    }
  }

  // === ЛИБЕРО ВХОДИТ ===
  function liberoIn(playerOutId) {
    if (!team.value.isMatchActive) return
    if (!team.value.libero) return

    const playerOut = team.value.players.find(p => p.id === playerOutId)
    if (!playerOut) return

    const idx = team.value.currentRotation.indexOf(playerOut)
    if (idx !== -1) {
      team.value.currentRotation[idx] = team.value.libero
      team.value.isLiberoOnCourt = true
      addLiberoEvent('in', playerOut, false)
      applyLiberoRules(false, false)
    }
  }

  // === ЛИБЕРО ВЫХОДИТ ===
  function liberoOut() {
    if (!team.value.isMatchActive) return
    if (!team.value.libero || !team.value.isLiberoOnCourt) return

    const idx = team.value.currentRotation.indexOf(team.value.libero)
    if (idx !== -1) {
      const available = team.value.players.find(p =>
        !team.value.currentRotation.includes(p) &&
        p.id !== team.value.libero?.id
      )
      if (available) {
        team.value.currentRotation[idx] = available
        team.value.isLiberoOnCourt = false
        addLiberoEvent('out', available, false)
      }
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
      id: Date.now() + Math.random(),
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
      id: Date.now() + Math.random(),
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
      id: Date.now() + Math.random(),
      order: eventOrder,
      type: 'timeout',
      teamName: team.value.name,
      timestamp: Date.now(),
      setNumber: currentRally.value.setNumber,
      score: { home: currentRally.value.score.home, away: currentRally.value.score.away }
    })
  }

  // === РОТАЦИЯ ===
  function rotateTeam() {
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

    applyLiberoRules(true, false)
  }

  function findReplacedMB() {
    const rotation = team.value.currentRotation
    for (const player of team.value.players) {
      if (player.position === 'MB' &&
          !rotation.includes(player) &&
          player.id !== team.value.libero?.id) {
        return player
      }
    }
    return null
  }

  function replaceLiberoWithMBInternal() {
    if (!team.value.libero || !team.value.isLiberoOnCourt) return

    const rotation = team.value.currentRotation
    const idx = rotation.indexOf(team.value.libero)

    if (idx !== -1) {
      const mbPlayer = findReplacedMB()
      if (mbPlayer) {
        rotation[idx] = mbPlayer
        team.value.isLiberoOnCourt = false
        team.value.currentRotation = [...rotation]
        return mbPlayer
      }
    }
    return null
  }

  // === ПРИМЕНЕНИЕ ПРАВИЛ ЛИБЕРО ===
  function applyLiberoRules(recordEvent = false, isPreRally = false) {
    if (!team.value.isMatchActive) return
    if (!team.value.libero) return

    const rotation = team.value.currentRotation
    if (rotation.length === 0) return

    const backRowZones = [1, 5, 6]

    if (team.value.isLiberoOnCourt) {
      const idx = rotation.indexOf(team.value.libero)
      if (idx !== -1) {
        const zone = idx + 1
        if ([2, 3, 4].includes(zone)) {
          const mbPlayer = replaceLiberoWithMBInternal()
          if (mbPlayer && recordEvent) {
            addLiberoEvent('out', mbPlayer, isPreRally)
          }
          return
        }
      }
    }

    if (!team.value.isServing) {
      let mbIndex = -1
      rotation.forEach((player, index) => {
        const zone = index + 1
        if (player && player.position === 'MB' && backRowZones.includes(zone)) {
          mbIndex = index
        }
      })

      if (mbIndex !== -1 && !team.value.isLiberoOnCourt) {
        const replacedPlayer = rotation[mbIndex]
        rotation[mbIndex] = team.value.libero
        team.value.isLiberoOnCourt = true
        if (recordEvent) {
          addLiberoEvent('in', replacedPlayer, isPreRally)
        }
      }
    }

    if (team.value.isServing) {
      const playerInZone1 = rotation[0]

      if (playerInZone1 && playerInZone1.id === team.value.libero?.id) {
        const mbPlayer = replaceLiberoWithMBInternal()
        if (mbPlayer && recordEvent) {
          addLiberoEvent('out', mbPlayer, isPreRally)
        }
        return
      }

      if (playerInZone1 && playerInZone1.position === 'MB') {
        if (team.value.isLiberoOnCourt) {
          const mbPlayer = replaceLiberoWithMBInternal()
          if (mbPlayer && recordEvent) {
            addLiberoEvent('out', mbPlayer, isPreRally)
          }
        }
        return
      }

      let mbIndex = -1
      rotation.forEach((player, index) => {
        const zone = index + 1
        if (player && player.position === 'MB' && backRowZones.includes(zone)) {
          mbIndex = index
        }
      })

      if (mbIndex !== -1 && !team.value.isLiberoOnCourt) {
        const replacedPlayer = rotation[mbIndex]
        rotation[mbIndex] = team.value.libero
        team.value.isLiberoOnCourt = true
        if (recordEvent) {
          addLiberoEvent('in', replacedPlayer, isPreRally)
        }
      }
    }

    team.value.currentRotation = [...rotation]
  }

  // === УСТАНОВИТЬ СТАТУС ПОДАЧИ ===
  function setServing(isServing) {
    team.value.isServing = isServing
    currentRally.value.isServing = isServing

    if (!team.value.isMatchActive) {
      const rotation = team.value.currentRotation
      if (rotation.length > 0 && team.value.libero) {
        const backRowZones = [1, 5, 6]
        if (!isServing) {
          let mbIndex = -1
          rotation.forEach((player, index) => {
            const zone = index + 1
            if (player && player.position === 'MB' && backRowZones.includes(zone)) {
              mbIndex = index
            }
          })
          if (mbIndex !== -1 && !team.value.isLiberoOnCourt) {
            rotation[mbIndex] = team.value.libero
            team.value.isLiberoOnCourt = true
          }
        } else {
          if (team.value.isLiberoOnCourt) {
            const idx = rotation.indexOf(team.value.libero)
            if (idx !== -1) {
              const mbPlayer = findReplacedMB()
              if (mbPlayer) {
                rotation[idx] = mbPlayer
                team.value.isLiberoOnCourt = false
              }
            }
          }
        }
        team.value.currentRotation = [...rotation]
      }
      return
    }
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
    if (team.value.isLiberoOnCourt) {
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
    if (isPointWon) {
      rally.score.home += 1
      if (team.value.isServing) {
        // Выиграли на своей подаче — ротации НЕТ
      } else {
        rotateTeam()
        team.value.isServing = true
        currentRally.value.isServing = true
      }
    } else {
      rally.score.away += 1
      if (team.value.isServing) {
        team.value.isServing = false
        currentRally.value.isServing = false
      }
    }

    // Сохраняем розыгрыш в историю
    rallyCounter++
    const currentRallyNumber = rallyCounter

    eventOrder++
    events.value.push({
      id: Date.now() + Math.random(),
      order: eventOrder,
      type: 'rally',
      rallyNumber: currentRallyNumber,
      setNumber: rally.setNumber,
      score: { home: rally.score.home, away: rally.score.away },
      actions: [...rally.actions],
      isPointWon: isPointWon
    })

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
        id: Date.now() + Math.random(),
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
          id: Date.now() + Math.random(),
          order: eventOrder + 1,
          type: 'match_finished',
          score: { home: setsWon.home, away: setsWon.away },
          winner: setsWon.home >= 3 ? 'home' : 'away',
          timestamp: Date.now()
        })
        // Матч полностью остановлен
        team.value.isMatchActive = false
        currentRally.value.isActive = false
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
    team.value.isServing = false
    team.value.isLiberoOnCourt = false
    team.value.rotationStep = 0
    team.value.isMatchActive = false
    team.value.isOurServe = true
    team.value.currentRotation = [...team.value.lineup]
    team.value.startingPositions = {}
    team.value.setServing = {}
    eventOrder = 0
    rallyCounter = 0
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
    rallyCounter
  }
})
