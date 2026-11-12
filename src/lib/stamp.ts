/** Envelope stamp text: "6 MO", "1 YR", "10 YR", from the whole months between writing and delivery. */
export function stampLabel(written: Date, deliver: Date): string {
  const months = Math.round(
    (deliver.getFullYear() - written.getFullYear()) * 12 +
      deliver.getMonth() -
      written.getMonth() +
      (deliver.getDate() - written.getDate()) / 31,
  );
  if (months < 1) return "SOON";
  return months < 12 ? `${months} MO` : `${Math.round(months / 12)} YR`;
}
