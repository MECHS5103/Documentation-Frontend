// services/api.js
export const API_URL =
  'https://api.team5103.com/api';
// 'https://script.google.com/macros/s/AKfycbz3b2ncvEKcdHMvsdwukIR9EATgIPZG0pk4ry-NpyIHFYWxZAPqJY1Va9b6vuVuoSf5jw/exec';

export const postApi = async (body) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  return response.json();
};

export const fetchLessonData = async (catArg, secArg, lesArg) => {
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
    return [];
  }

  const url = `${API_URL}?category=${encodeURIComponent(
    category
  )}&section=${encodeURIComponent(section)}&lesson=${encodeURIComponent(
    lesson
  )}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    const rawText = await response.text();

    if (!rawText || rawText.trim() === '') {
      return [];
    }

    let json = {};
    try {
      json = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Failed to parse response JSON:', parseErr);
      return [];
    }

    if (json.error) {
      console.error('Apps Script error:', json.error);
      return [];
    }

    if (json && Array.isArray(json.data)) {
      return json.data;
    } else if (Array.isArray(json)) {
      return json;
    }

    return [];
  } catch (error) {
    console.error('Error fetching lesson data:', error);
    throw error;
  }
};