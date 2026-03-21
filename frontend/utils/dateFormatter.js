/**
 * Formats a date string or Date object into a standardized display format: "DD MMM YYYY"
 * Example: "2026-03-22T00:00:00Z" -> "22 Mar 2026"
 * 
 * @param {string|Date} date - The date to format
 * @returns {string} The formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  
  // Check if date is valid
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const day = d.getDate().toString().padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
};

/**
 * Formats a date string into a relative time string (e.g., "2 hours ago")
 * or falls back to formatDate if more than a few days old.
 * 
 * @param {string|Date} date - The date to format
 * @returns {string} The relative or formatted date string
 */
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - d) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(d);
};

/**
 * Formats a date string into "DD MMM YYYY, HH:mm"
 * 
 * @param {string|Date} date - The date to format
 * @returns {string} The formatted date and time string
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const datePart = formatDate(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${datePart}, ${hours}:${minutes}`;
};
