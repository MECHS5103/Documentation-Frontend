export const categories = [
  'Mechanical',
  'Build',
  'Design',
  'Programming',
  'Electrical',
  'Marketing',
];

export const descriptions = [
  'The Robot',
  'The Field',
  'The CAD (OnShape)',
  'The Code (Java)',
  'The Wiring',
  'Sponsorships & Social Media',
];

// The Marketing tab used to be called "Media". Old links, bookmarks and saved
// last-visited pages still say "Media", so map them to the new name.
export const normalizeCategory = (name) =>
  typeof name === 'string' && name.trim().toLowerCase() === 'media'
    ? 'Marketing'
    : name;
