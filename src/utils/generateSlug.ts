export const generateSlug = (text: string): string => {
  return text
    .toLowerCase() // 1. Convert to lowercase
    .trim() // 2. Remove leading/trailing whitespace
    .replace(/[^\w\s-]/g, "") // 3. Remove all non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, "-") // 4. Replace spaces, underscores, and multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, ""); // 5. Remove hyphens from the start or end of the string
};
