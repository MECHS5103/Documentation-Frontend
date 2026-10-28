// hooks/useFetchData.js
import { useEffect } from 'react';
import { API_URL, fetchLessonDocument } from '../services/api';
import dataCache from '../services/cache';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const useFetchData = ({
  navPanel,
  setTocData,
  setTocVersion,
  setTocLoadState,
  setPageElements,
  setPageVersion,
  documentKey,
  setDocumentLoadState,
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
      setTocVersion(0);
      setTocLoadState({ category: null, status: 'idle' });
      setPageElements([]);
      setPageVersion(0);
      setDocumentLoadState({ key: null, status: 'idle' });
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
      setTocVersion(Number.isInteger(cachedEntry.version) ? cachedEntry.version : 0);
      setTocLoadState({ category: navPanel, status: 'ready' });

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
      setTocData([]);
      setTocVersion(0);
      setTocLoadState({ category: navPanel, status: 'loading' });
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

          if (!response.ok) {
            throw new Error('The table of contents request failed.');
          }
          if (!rawText || rawText.trim() === '') {
            throw new Error('The table of contents response was empty.');
          }

          let result = {};
          try {
            result = JSON.parse(rawText);
          } catch (e) {
            throw new Error('The table of contents response was invalid.');
          }

          if (result.error) {
            throw new Error(result.error);
          }

          if (!isMounted) return;

          const tocList = Array.isArray(result.data)
            ? result.data
            : Array.isArray(result)
            ? result
            : [];

          dataCache.toc[navPanel] = {
            tocData: tocList,
            version: Number.isInteger(result.version) ? result.version : 0,
            timestamp: Date.now(),
          };

          setTocData(tocList);
          setTocVersion(Number.isInteger(result.version) ? result.version : 0);
          setTocLoadState({ category: navPanel, status: 'ready' });

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
          if (isMounted && !cachedEntry) {
            setTocData([]);
            setTocVersion(0);
            setTocLoadState({ category: navPanel, status: 'error' });
          }
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
    setPageVersion,
    setDocumentLoadState,
    setTocData,
    setTocLoadState,
    setTocVersion,
  ]);

  // 2. Fetch page elements whenever navPanel, activeSection, or activeLesson updates
  useEffect(() => {
    if (!documentKey || !navPanel || !activeSection || !activeLesson) {
      setPageElements([]);
      setPageVersion(0);
      setDocumentLoadState({ key: null, status: 'idle' });
      return;
    }

    let isMounted = true;
    setPageElements([]);
    setPageVersion(0);
    setDocumentLoadState({ key: documentKey, status: 'loading' });

    const loadPageData = async () => {
      try {
        setLoading(true);
        const document = await fetchLessonDocument(
          navPanel,
          activeSection,
          activeLesson
        );
        const data = document.data;

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
          setPageVersion(document.version);
          setDocumentLoadState({ key: documentKey, status: 'ready' });
        }
      } catch (err) {
        console.error('Error loading page elements:', err);
        if (isMounted) {
          setPageElements([]);
          setPageVersion(0);
          setDocumentLoadState({ key: documentKey, status: 'error' });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [
    navPanel,
    activeSection,
    activeLesson,
    documentKey,
    setPageElements,
    setPageVersion,
    setDocumentLoadState,
    setLoading,
  ]);
};

export default useFetchData;
