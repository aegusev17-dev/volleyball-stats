const STORAGE_KEY = 'volleyball-saved-matches';

export function getSavedMatches() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    const matches = JSON.parse(data);
    return Array.isArray(matches) ? matches : [];
  } catch (error) {
    console.error('Не удалось загрузить сохранённые матчи:', error);
    return [];
  }
}

export function saveMatch(match) {
  const matches = getSavedMatches();

  const index = matches.findIndex(item => item.id === match.id);

  if (index !== -1) {
    matches[index] = match;
  } else {
    matches.unshift(match);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    return true;
  } catch (error) {
    console.error('Не удалось сохранить матч:', error);
    throw new Error('Не удалось сохранить матч в браузере.');
  }
}

export function deleteMatch(matchId) {
  const matches = getSavedMatches();
  const updatedMatches = matches.filter(
    match => match.id !== matchId
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedMatches)
  );
}

export function getMatchById(matchId) {
  return getSavedMatches().find(
    match => match.id === matchId
  ) || null;
}

