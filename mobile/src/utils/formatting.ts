export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export function titleToCamel(str: string): string {
  return str
    .split(/\s+/)
    .map((word, i) =>
      i === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('')
}
