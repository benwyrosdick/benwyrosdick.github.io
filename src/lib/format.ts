export function excerpt(body: string, words = 50): string {
  const stripped = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_\-\[\]\(\)!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = stripped.split(' ');
  const head = tokens.slice(0, words).join(' ');
  return tokens.length > words ? `${head}…` : head;
}

export function longDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
