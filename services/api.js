// services/api.js
export const API_URL =
  process.env.EXPO_PUBLIC_APPS_SCRIPT_URL || '';

export const getApiUrl = () => {
  if (!API_URL) {
    throw new Error('The documentation API is not configured for this deployment.');
  }
  return API_URL;
};

export const postApi = async (body) => {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  return response.json();
};

export const fetchLessonDocument = async (catArg, secArg, lesArg) => {
  // Support both (category, section, lesson) AND ({ category, section, lesson })
  let category = catArg;
  let section = secArg;
  let lesson = lesArg;

  if (typeof catArg === 'object' && catArg !== null) {
    category = catArg.category;
    section = catArg.section;
    lesson = catArg.lesson;
  }

  if (!category || !section || !lesson) {
    return { data: [], version: 0 };
  }

  const url = `${getApiUrl()}?category=${encodeURIComponent(
    category
  )}&section=${encodeURIComponent(section)}&lesson=${encodeURIComponent(
    lesson
  )}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error('The page request failed.');
    }

    const rawText = await response.text();

    if (!rawText || rawText.trim() === '') {
      throw new Error('The page response was empty.');
    }

    let json = {};
    try {
      json = JSON.parse(rawText);
    } catch (parseErr) {
      throw new Error('The page response was invalid.');
    }

    if (json.error) {
      throw new Error(json.error);
    }

    if (json && Array.isArray(json.data)) {
      return {
        data: json.data,
        version: Number.isInteger(json.version) ? json.version : 0,
      };
    } else if (Array.isArray(json)) {
      return { data: json, version: 0 };
    }

    return { data: [], version: 0 };
  } catch (error) {
    console.error('Error fetching lesson data:', error);
    throw error;
  }
};

export const fetchLessonData = async (...args) => {
  const document = await fetchLessonDocument(...args);
  return document.data;
};
