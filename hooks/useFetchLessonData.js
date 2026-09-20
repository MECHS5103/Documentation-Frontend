// hooks/useFetchLessonData.js
import { useState, useEffect } from 'react';
import { fetchLessonData } from '../services/api';

export const useFetchLessonData = (catArg, secArg, lesArg) => {
  const [pageElements, setPageElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Support both positional arguments and object input
  let category = catArg;
  let section = secArg;
  let lesson = lesArg;

  if (typeof catArg === 'object' && catArg !== null) {
    category = catArg.category;
    section = catArg.section;
    lesson = catArg.lesson;
  }

  useEffect(() => {
    if (!category || !section || !lesson) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadLesson = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchLessonData(category, section, lesson);

        if (isMounted) {
          if (Array.isArray(data)) {
            const parsedElements = data.map((item) => {
              if (item.type === 'VideoPill' || item.type === 'Video') {
                return {
                  ...item,
                  type: 'VideoPill',
                  videoUrl: item.videoUrl || item.url || item.language || '',
                };
              }
              return item;
            });

            setPageElements(parsedElements);
          } else {
            setPageElements([]);
          }
        }
      } catch (err) {
        console.error('Error in useFetchLessonData:', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLesson();

    return () => {
      isMounted = false;
    };
  }, [category, section, lesson]);

  return { pageElements, loading, error, setPageElements };
};

export default useFetchLessonData;