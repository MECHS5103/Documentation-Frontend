// hooks/useFetchData.js
import { useEffect } from 'react';
import { API_URL, fetchLessonData } from '../services/api';
import dataCache from '../services/cache';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const useFetchData = ({
  navPanel,
  setTocData,
  setPageElements,
  activeSection,
  setActiveSection,
  activeLesson,
  setActiveLesson,
  setLoading,
}) => {
  // 1. Fetch TOC when navPanel changes
  useEffect(() => {
    if (!navPanel || navPanel === 'Landing Page' || navPanel === 'Test') {
      setTocData([]);
      setPageElements([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    if (!dataCache.toc) dataCache.toc = {};
    if (!dataCache.pages) dataCache.pages = {};

    const cachedEntry = dataCache.toc[navPanel];
    const isStale =
      !cachedEntry ||
      !cachedEntry.timestamp ||
      Date.now() - cachedEntry.timestamp > FIVE_MINUTES_MS;

    if (cachedEntry) {
      const cachedData = cachedEntry.tocData || [];
      setTocData(cachedData);

      const firstSubject = cachedData.find(
        (item) => item.type && item.type.toLowerCase() === 'subjecttext'
      );
      const firstLesson = cachedData.find(
        (item) => item.type && item.type.toLowerCase() === 'lessontext'
      );

      if (firstSubject) setActiveSection((prev) => prev || firstSubject.text || '');
      if (firstLesson) setActiveLesson((prev) => prev || firstLesson.text || '');

      setLoading(false);
    } else {
      setLoading(true);
    }

    if (isStale) {
      const fetchTocData = async () => {
        try {
          const url = `${API_URL}?category=${encodeURIComponent(navPanel)}&toc=true`;

          const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
          });

          const rawText = await response.text();

          if (!rawText || rawText.trim() === '') {
            if (isMounted && !cachedEntry) setTocData([]);
            return;
          }

          let result = {};
          try {
            result = JSON.parse(rawText);
          } catch (e) {
            console.warn('TOC response failed to parse as JSON');
          }

          if (!isMounted) return;

          const tocList = Array.isArray(result.data)
            ? result.data
            : Array.isArray(result)
            ? result
            : [];

          dataCache.toc[navPanel] = {
            tocData: tocList,
            timestamp: Date.now(),
          };

          setTocData(tocList);

          const firstSubject = tocList.find(
            (item) => item.type && item.type.toLowerCase() === 'subjecttext'
          );
          const firstLesson = tocList.find(
            (item) => item.type && item.type.toLowerCase() === 'lessontext'
          );

          if (firstSubject) setActiveSection((prev) => prev || firstSubject.text || '');
          if (firstLesson) setActiveLesson((prev) => prev || firstLesson.text || '');
        } catch (error) {
          console.error('Error fetching TOC data:', error);
          if (isMounted && !cachedEntry) setTocData([]);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchTocData();
    }

    return () => {
      isMounted = false;
    };
  }, [
    navPanel,
    setActiveLesson,
    setActiveSection,
    setLoading,
    setPageElements,
    setTocData,
  ]);

  // 2. Fetch page elements whenever navPanel, activeSection, or activeLesson updates
  useEffect(() => {
    if (!navPanel || !activeSection || !activeLesson) {
      return;
    }

    let isMounted = true;

    const loadPageData = async () => {
      try {
        setLoading(true);
        const data = await fetchLessonData(navPanel, activeSection, activeLesson);

        if (isMounted && Array.isArray(data)) {
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
        }
      } catch (err) {
        console.error('Error loading page elements:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [navPanel, activeSection, activeLesson, setPageElements, setLoading]);
};

export default useFetchData;