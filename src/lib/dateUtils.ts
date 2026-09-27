const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

const INDONESIAN_MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const INDONESIAN_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agt",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/**
 * Mengubah string tanggal (format Indonesia "14 September 2026" atau ISO "2026-09-14") menjadi objek Date (00:00:00).
 */
export function parseDateString(str?: string | null): Date | null {
  if (!str) return null;
  const trimmed = str.trim();

  // Cek apakah format Indonesia "14 September 2026"
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const monthKey = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && INDONESIAN_MONTHS[monthKey] !== undefined && !isNaN(year)) {
      return new Date(year, INDONESIAN_MONTHS[monthKey], day, 0, 0, 0, 0);
    }
  }

  // Cek format ISO yyyy-mm-dd
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10),
      0,
      0,
      0,
      0
    );
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  return null;
}

/**
 * Format Date ke string bahasa Indonesia.
 * "long" -> "14 September 2026"
 * "short" -> "14 Sep 2026"
 */
export function formatDate(date: Date, type: "long" | "short" = "long"): string {
  const day = date.getDate();
  const month = type === "short" ? INDONESIAN_MONTH_SHORT[date.getMonth()] : INDONESIAN_MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isDateInRange(target: Date, start: Date, end: Date): boolean {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t >= Math.min(s, e) && t <= Math.max(s, e);
}

export function parseHourToMinutes(hStr: string): number {
  if (!hStr) return 0;
  const cleaned = hStr.replace("WIB", "").trim().replace(".", ":");
  const parts = cleaned.split(":");
  const hour = parseInt(parts[0] || "0", 10);
  const min = parseInt(parts[1] || "0", 10);
  return hour * 60 + min;
}
