/** Split the published name/purpose composition without changing source data or URLs. */
export function projectHeading(name: string): {
  title: string;
  subtitle: string;
} {
  const value = name.trim();
  const separator = /\s+[–—-]\s+/.exec(value);
  return separator
    ? {
        title: value.slice(0, separator.index).trim(),
        subtitle: value.slice(separator.index + separator[0].length).trim(),
      }
    : { title: value, subtitle: "" };
}
