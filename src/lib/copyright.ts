/**
 * 版权起始年：本站自 2025-10-08 起由所有者维护，此前提交属上游模板作者。
 * 该年写死，结束年取当前年份，避免版权年份随时间过期。
 */
export const COPYRIGHT_START_YEAR = 2025;

/** 起始年与当前年相同时只显示一年，避免出现「2025–2025」 */
export function copyrightYears(year: number): string {
  return year > COPYRIGHT_START_YEAR ? `${COPYRIGHT_START_YEAR}–${year}` : `${year}`;
}
