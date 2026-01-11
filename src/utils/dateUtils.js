/**
 * Date utility functions for Pacific timezone
 */

/**
 * Get today's date string (YYYY-MM-DD) in Pacific timezone
 */
export function getPacificDateString() {
  const now = new Date();
  // Use Intl.DateTimeFormat to get date components in Pacific time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  
  return `${year}-${month}-${day}`;
}
