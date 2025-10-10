export const MS_IN_MINUTE = 1000 * 60;
export const MS_IN_HOUR = 60 * MS_IN_MINUTE;
export const MS_IN_DAY = 24 * MS_IN_HOUR;
export const MS_IN_YEAR = 365 * MS_IN_DAY; // Approximation

/**
 * Calculates a timestamp 15 minutes from the current time.
 * @returns {number} Time in milliseconds from the epoch.
 */
export const fifteenMinutesFromNow = (): number => {
  return Date.now() + 15 * MS_IN_MINUTE;
};

/**
 * Calculates a timestamp 30 days from the current time.
 * @returns {number} Time in milliseconds from the epoch.
 */
export const thirtyDaysFromNow = (): number => {
  return Date.now() + 30 * MS_IN_DAY;
};

/**
 * Calculates a timestamp 1 year from the current time.
 * @returns {number} Time in milliseconds from the epoch.
 */
export const OneYearFromNow = (): number => {
  return Date.now() + MS_IN_YEAR;
};
