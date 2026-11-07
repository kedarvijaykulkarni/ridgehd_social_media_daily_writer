// YYYY-MM-DD in the machine's local time zone. toISOString() is UTC, so a
// run between 00:00 and 05:29 IST was dated (and foldered) as yesterday.
export function localDateString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
