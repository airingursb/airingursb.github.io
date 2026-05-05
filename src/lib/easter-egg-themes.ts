// Homepage easter-egg theme map.
// Returns one of the 6 accent presets (green/blue/purple/amber/rose/cyan)
// when today matches a holiday. Otherwise null = no override.
//
// Priority baked in at table-construction time:
//   生日 > 中国法定 > SG 法定 > 节气 > 中国民俗 > 西方 > 趣味/电商
// FLOATING_DATES (year-specific) wins over FIXED_DATES (every year).

export type EasterTheme = 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'cyan';

export interface ThemeMatch {
  theme: EasterTheme;
  zh: string;
  en: string;
}

// Fires every year on the same Gregorian date. Key: 'MM-DD'.
export const FIXED_DATES: Record<string, ThemeMatch> = {
  '01-01': { theme: 'cyan',   zh: '元旦',           en: "New Year's Day" },
  '02-02': { theme: 'purple', zh: 'Peak Day 2.2',   en: 'Peak Day 2.2' },
  '02-14': { theme: 'rose',   zh: '情人节',         en: "Valentine's Day" },
  '03-03': { theme: 'purple', zh: 'Peak Day 3.3',   en: 'Peak Day 3.3' },
  '03-08': { theme: 'rose',   zh: '妇女节',         en: "International Women's Day" },
  '03-12': { theme: 'green',  zh: '植树节',         en: 'Arbor Day' },
  '03-14': { theme: 'amber',  zh: 'π 日',           en: 'Pi Day' },
  '03-17': { theme: 'green',  zh: '圣帕特里克节',   en: "St. Patrick's Day" },
  '03-22': { theme: 'blue',   zh: '世界水日',       en: 'World Water Day' },
  '04-01': { theme: 'purple', zh: '愚人节',         en: "April Fools' Day" },
  '04-22': { theme: 'green',  zh: '地球日',         en: 'Earth Day' },
  '04-23': { theme: 'blue',   zh: '世界读书日',     en: 'World Book Day' },
  '05-01': { theme: 'rose',   zh: '劳动节',         en: 'Labour Day' },
  '05-04': { theme: 'blue',   zh: '青年节',         en: 'Star Wars Day' },
  '05-20': { theme: 'rose',   zh: '5·20 表白日',    en: '5·20 Love Day' },
  '06-01': { theme: 'cyan',   zh: '儿童节',         en: "Children's Day" },
  '06-06': { theme: 'purple', zh: 'Peak Day 6.6',   en: 'Peak Day 6.6' },
  '06-18': { theme: 'purple', zh: '6·18 购物节',    en: '6·18 Shopping Festival' },
  '06-28': { theme: 'cyan',   zh: 'τ 日',           en: 'Tau Day' },
  '06-30': { theme: 'cyan',   zh: '🎂 生日',         en: '🎂 Birthday' },
  '07-01': { theme: 'rose',   zh: '建党节',         en: 'CCP Founding Day' },
  '07-04': { theme: 'blue',   zh: '美国独立日',     en: 'US Independence Day' },
  '07-07': { theme: 'purple', zh: 'Peak Day 7.7',   en: 'Peak Day 7.7' },
  '08-08': { theme: 'purple', zh: 'Peak Day 8.8',   en: 'Peak Day 8.8' },
  '08-09': { theme: 'rose',   zh: '新加坡国庆',     en: 'SG National Day' },
  '09-09': { theme: 'purple', zh: 'Peak Day 9.9',   en: 'Peak Day 9.9' },
  '09-10': { theme: 'amber',  zh: '教师节',         en: "Teachers' Day" },
  '09-13': { theme: 'green',  zh: '程序员节',       en: "Programmer's Day" },
  '10-01': { theme: 'rose',   zh: '国庆节',         en: 'China National Day' },
  '10-02': { theme: 'rose',   zh: '国庆假',         en: 'National Day Holiday' },
  '10-03': { theme: 'rose',   zh: '国庆假',         en: 'National Day Holiday' },
  '10-04': { theme: 'rose',   zh: '国庆假',         en: 'National Day Holiday' },
  '10-05': { theme: 'rose',   zh: '国庆假',         en: 'National Day Holiday' },
  '10-06': { theme: 'rose',   zh: '国庆假',         en: 'National Day Holiday' },
  '10-07': { theme: 'rose',   zh: '国庆假',         en: 'National Day Holiday' },
  '10-10': { theme: 'purple', zh: 'Peak Day 10.10', en: 'Peak Day 10.10' },
  '10-24': { theme: 'green',  zh: '1024 程序员节',  en: '1024 Programmer Day' },
  '10-31': { theme: 'amber',  zh: '万圣节',         en: 'Halloween' },
  '11-11': { theme: 'purple', zh: '双十一',         en: 'Peak Day 11.11' },
  '12-01': { theme: 'rose',   zh: '世界艾滋病日',   en: 'World AIDS Day' },
  '12-12': { theme: 'purple', zh: '双十二',         en: 'Peak Day 12.12' },
  '12-24': { theme: 'green',  zh: '平安夜',         en: 'Christmas Eve' },
  '12-25': { theme: 'green',  zh: '圣诞节',         en: 'Christmas' },
  '12-26': { theme: 'green',  zh: '节礼日',         en: 'Boxing Day' },
  '12-31': { theme: 'cyan',   zh: '跨年夜',         en: "New Year's Eve" },
};

// Year-specific (lunar / Islamic / Easter / 节气 / Mother's & Father's Day / Thanksgiving).
// Hardcoded 2026–2028; extend yearly. Conflicts pre-resolved by priority.
export const FLOATING_DATES: Record<string, ThemeMatch> = {
  // ───────── 2026 ─────────
  '2026-01-26': { theme: 'amber',  zh: '腊八节',         en: 'Laba Festival' },
  '2026-02-04': { theme: 'green',  zh: '立春',           en: 'Start of Spring' },
  '2026-02-10': { theme: 'rose',   zh: '小年',           en: 'Little New Year' },
  '2026-02-16': { theme: 'rose',   zh: '除夕',           en: "Lunar New Year's Eve" },
  '2026-02-17': { theme: 'rose',   zh: '春节',           en: 'Lunar New Year' },
  '2026-02-18': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2026-02-19': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2026-02-20': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2026-02-21': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2026-02-22': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2026-03-03': { theme: 'amber',  zh: '元宵节',         en: 'Lantern Festival' },
  '2026-03-20': { theme: 'amber',  zh: '开斋节',         en: 'Hari Raya Puasa' },
  '2026-04-03': { theme: 'purple', zh: '耶稣受难日',     en: 'Good Friday' },
  '2026-04-04': { theme: 'green',  zh: '清明假',         en: 'Qingming Holiday' },
  '2026-04-05': { theme: 'green',  zh: '清明节',         en: 'Qingming Festival' },
  '2026-04-06': { theme: 'green',  zh: '清明假',         en: 'Qingming Holiday' },
  '2026-05-02': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2026-05-03': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2026-05-04': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2026-05-05': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2026-05-10': { theme: 'rose',   zh: '母亲节',         en: "Mother's Day" },
  '2026-05-26': { theme: 'amber',  zh: '哈芝节',         en: 'Hari Raya Haji' },
  '2026-05-31': { theme: 'amber',  zh: '卫塞节',         en: 'Vesak Day' },
  '2026-06-19': { theme: 'green',  zh: '端午节',         en: 'Dragon Boat Festival' },
  '2026-06-20': { theme: 'green',  zh: '端午假',         en: 'Dragon Boat Holiday' },
  '2026-06-21': { theme: 'amber',  zh: '夏至',           en: 'Summer Solstice' },
  '2026-08-07': { theme: 'amber',  zh: '立秋',           en: 'Start of Autumn' },
  '2026-08-19': { theme: 'purple', zh: '七夕',           en: 'Qixi Festival' },
  '2026-08-27': { theme: 'purple', zh: '中元节',         en: 'Ghost Festival' },
  '2026-09-23': { theme: 'amber',  zh: '秋分',           en: 'Autumn Equinox' },
  '2026-09-25': { theme: 'amber',  zh: '中秋节',         en: 'Mid-Autumn Festival' },
  '2026-09-26': { theme: 'amber',  zh: '中秋假',         en: 'Mid-Autumn Holiday' },
  '2026-09-27': { theme: 'amber',  zh: '中秋假',         en: 'Mid-Autumn Holiday' },
  '2026-10-18': { theme: 'amber',  zh: '重阳节',         en: 'Double Ninth Festival' },
  '2026-11-07': { theme: 'blue',   zh: '立冬',           en: 'Start of Winter' },
  '2026-11-08': { theme: 'amber',  zh: '屠妖节',         en: 'Deepavali' },
  '2026-11-26': { theme: 'amber',  zh: '感恩节',         en: 'Thanksgiving' },
  '2026-11-27': { theme: 'purple', zh: '黑色星期五',     en: 'Black Friday' },
  '2026-12-21': { theme: 'cyan',   zh: '冬至',           en: 'Winter Solstice' },

  // ───────── 2027 ─────────
  '2027-01-15': { theme: 'amber',  zh: '腊八节',         en: 'Laba Festival' },
  '2027-01-30': { theme: 'rose',   zh: '小年',           en: 'Little New Year' },
  '2027-02-04': { theme: 'green',  zh: '立春',           en: 'Start of Spring' },
  '2027-02-05': { theme: 'rose',   zh: '除夕',           en: "Lunar New Year's Eve" },
  '2027-02-06': { theme: 'rose',   zh: '春节',           en: 'Lunar New Year' },
  '2027-02-07': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2027-02-08': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2027-02-09': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2027-02-10': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2027-02-11': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2027-02-20': { theme: 'amber',  zh: '元宵节',         en: 'Lantern Festival' },
  '2027-03-09': { theme: 'amber',  zh: '开斋节',         en: 'Hari Raya Puasa' },
  '2027-03-21': { theme: 'green',  zh: '春分',           en: 'Spring Equinox' },
  '2027-03-26': { theme: 'purple', zh: '耶稣受难日',     en: 'Good Friday' },
  '2027-04-04': { theme: 'green',  zh: '清明假',         en: 'Qingming Holiday' },
  '2027-04-05': { theme: 'green',  zh: '清明节',         en: 'Qingming Festival' },
  '2027-04-06': { theme: 'green',  zh: '清明假',         en: 'Qingming Holiday' },
  '2027-05-02': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2027-05-03': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2027-05-04': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2027-05-05': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2027-05-06': { theme: 'amber',  zh: '立夏',           en: 'Start of Summer' },
  '2027-05-09': { theme: 'rose',   zh: '母亲节',         en: "Mother's Day" },
  '2027-05-16': { theme: 'amber',  zh: '哈芝节',         en: 'Hari Raya Haji' },
  '2027-05-20': { theme: 'amber',  zh: '卫塞节',         en: 'Vesak Day' },
  '2027-06-08': { theme: 'green',  zh: '端午节',         en: 'Dragon Boat Festival' },
  '2027-06-09': { theme: 'green',  zh: '端午假',         en: 'Dragon Boat Holiday' },
  '2027-06-10': { theme: 'green',  zh: '端午假',         en: 'Dragon Boat Holiday' },
  '2027-06-20': { theme: 'blue',   zh: '父亲节',         en: "Father's Day" },
  '2027-06-21': { theme: 'amber',  zh: '夏至',           en: 'Summer Solstice' },
  '2027-08-08': { theme: 'purple', zh: '七夕',           en: 'Qixi Festival' },
  '2027-08-16': { theme: 'purple', zh: '中元节',         en: 'Ghost Festival' },
  '2027-09-15': { theme: 'amber',  zh: '中秋节',         en: 'Mid-Autumn Festival' },
  '2027-09-16': { theme: 'amber',  zh: '中秋假',         en: 'Mid-Autumn Holiday' },
  '2027-09-17': { theme: 'amber',  zh: '中秋假',         en: 'Mid-Autumn Holiday' },
  '2027-09-23': { theme: 'amber',  zh: '秋分',           en: 'Autumn Equinox' },
  '2027-10-08': { theme: 'amber',  zh: '重阳节',         en: 'Double Ninth Festival' },
  '2027-10-28': { theme: 'amber',  zh: '屠妖节',         en: 'Deepavali' },
  '2027-11-08': { theme: 'blue',   zh: '立冬',           en: 'Start of Winter' },
  '2027-11-25': { theme: 'amber',  zh: '感恩节',         en: 'Thanksgiving' },
  '2027-11-26': { theme: 'purple', zh: '黑色星期五',     en: 'Black Friday' },
  '2027-12-22': { theme: 'cyan',   zh: '冬至',           en: 'Winter Solstice' },

  // ───────── 2028 ─────────
  '2028-02-03': { theme: 'amber',  zh: '腊八节',         en: 'Laba Festival' },
  '2028-02-04': { theme: 'green',  zh: '立春',           en: 'Start of Spring' },
  '2028-02-18': { theme: 'rose',   zh: '小年',           en: 'Little New Year' },
  '2028-02-25': { theme: 'rose',   zh: '除夕',           en: "Lunar New Year's Eve" },
  '2028-02-26': { theme: 'rose',   zh: '春节',           en: 'Lunar New Year' },
  '2028-02-27': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2028-02-28': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2028-02-29': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2028-03-01': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2028-03-02': { theme: 'rose',   zh: '春节假',         en: 'Spring Festival Holiday' },
  '2028-03-11': { theme: 'amber',  zh: '元宵节',         en: 'Lantern Festival' },
  '2028-03-20': { theme: 'green',  zh: '春分',           en: 'Spring Equinox' },
  '2028-04-03': { theme: 'green',  zh: '清明假',         en: 'Qingming Holiday' },
  '2028-04-04': { theme: 'green',  zh: '清明节',         en: 'Qingming Festival' },
  '2028-04-05': { theme: 'green',  zh: '清明假',         en: 'Qingming Holiday' },
  '2028-04-14': { theme: 'purple', zh: '耶稣受难日',     en: 'Good Friday' },
  '2028-04-29': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2028-04-30': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2028-05-02': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2028-05-03': { theme: 'rose',   zh: '劳动节假',       en: 'Labour Day Holiday' },
  '2028-05-05': { theme: 'amber',  zh: '哈芝节',         en: 'Hari Raya Haji' },
  '2028-05-09': { theme: 'amber',  zh: '卫塞节',         en: 'Vesak Day' },
  '2028-05-14': { theme: 'rose',   zh: '母亲节',         en: "Mother's Day" },
  '2028-05-27': { theme: 'green',  zh: '端午假',         en: 'Dragon Boat Holiday' },
  '2028-05-28': { theme: 'green',  zh: '端午节',         en: 'Dragon Boat Festival' },
  '2028-05-29': { theme: 'green',  zh: '端午假',         en: 'Dragon Boat Holiday' },
  '2028-06-18': { theme: 'blue',   zh: '父亲节',         en: "Father's Day" },
  '2028-06-21': { theme: 'amber',  zh: '夏至',           en: 'Summer Solstice' },
  '2028-08-07': { theme: 'amber',  zh: '立秋',           en: 'Start of Autumn' },
  '2028-08-26': { theme: 'purple', zh: '七夕',           en: 'Qixi Festival' },
  '2028-09-04': { theme: 'purple', zh: '中元节',         en: 'Ghost Festival' },
  '2028-09-22': { theme: 'amber',  zh: '秋分',           en: 'Autumn Equinox' },
  '2028-09-26': { theme: 'amber',  zh: '重阳节',         en: 'Double Ninth Festival' },
  '2028-11-07': { theme: 'blue',   zh: '立冬',           en: 'Start of Winter' },
  '2028-11-15': { theme: 'amber',  zh: '屠妖节',         en: 'Deepavali' },
  '2028-11-23': { theme: 'amber',  zh: '感恩节',         en: 'Thanksgiving' },
  '2028-11-24': { theme: 'purple', zh: '黑色星期五',     en: 'Black Friday' },
  '2028-12-21': { theme: 'cyan',   zh: '冬至',           en: 'Winter Solstice' },
};

export function resolveTheme(date: Date): ThemeMatch | null {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return (
    FLOATING_DATES[`${yyyy}-${mm}-${dd}`] ??
    FIXED_DATES[`${mm}-${dd}`] ??
    null
  );
}
