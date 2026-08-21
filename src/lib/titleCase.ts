// "amara chukwu" / "AMARA CHUKWU" -> "Amara Chukwu".
//
// The Home header shows the household's name as the loudest thing on the
// screen, so it can't inherit whatever casing the user typed at sign-up.
// Hyphenated and apostrophed names keep their internal capitals ("Ade-Bello",
// "O'Neill") rather than being flattened to "Ade-bello".
export function toTitleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s\-'’])([\p{L}])/gu, (_match, boundary: string, letter: string) =>
      `${boundary}${letter.toLocaleUpperCase()}`
    );
}
