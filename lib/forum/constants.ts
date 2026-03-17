/** Разделы форума «Дом и стройка» — порядок и названия в приложении (не зависят от БД) */
export const FORUM_DOM_I_STROYKA = [
  { name: 'Материалы для строительства', slug: 'stroitelnye-materialy' },
  { name: 'Инструмент и техника', slug: 'instrumenty-i-oborudovanie' },
  { name: 'Фундаменты', slug: 'fundamenty' },
  { name: 'Крыша и кровля', slug: 'krovli-i-krovelnye-materialy' },
  { name: 'Окна и остекление', slug: 'okna-profili-osteklenie' },
  { name: 'Фасад и отделка', slug: 'fasady-i-fasadnye-materialy' },
  { name: 'Проекты домов', slug: 'proekty-domov-i-kottedzhey' },
  { name: 'Строим дом', slug: 'stroitelstvo-doma-kottedzha' },
  { name: 'Бани', slug: 'stroitelstvo-bani' },
  { name: 'Сараи и хозпостройки', slug: 'hozyaystvennye-postroyki' },
  { name: 'Заборы и ворота', slug: 'zabory-vorota-ograzhdeniya' },
] as const

/** Разделы форума «Инженерные системы» */
export const FORUM_INZHENERNYE_SISTEMY = [
  { name: 'Домашняя автоматизация', slug: 'umnyy-dom' },
  { name: 'Печи, камины', slug: 'pechi-i-kaminy' },
  { name: 'Системы отопления', slug: 'otoplenie' },
  { name: 'Вода и водопровод', slug: 'vodosnabzhenie' },
  { name: 'Канализация, дренаж', slug: 'kanalizaciya-i-drenazh' },
  { name: 'Вентиляция и кондиционирование', slug: 'ventilyaciya' },
  { name: 'Газ', slug: 'gazosnabzhenie' },
  { name: 'Электропроводка и электрика', slug: 'elektrika' },
] as const

/** Раздел «Не только о стройке» — общение на любые темы (внизу списка). В карточке отображается «Беседка». */
export const FORUM_BESEDKA = [{ name: 'Беседка', slug: 'besedka' }] as const

/** Slugs всех разделов форума (для навигации и fallback). */
export const FORUM_CATEGORY_SLUGS = [
  ...FORUM_DOM_I_STROYKA.map((c) => c.slug),
  ...FORUM_INZHENERNYE_SISTEMY.map((c) => c.slug),
  ...FORUM_BESEDKA.map((c) => c.slug),
]

/** Подмножество slug'ов для прегенерации при сборке (меньше страниц — быстрее компиляция). Остальные разделы открываются по клику со списка; прямой URL/обновление могут дать 404. Чтобы прегенерировать все — используйте FORUM_CATEGORY_SLUGS. */
export const FORUM_CATEGORY_SLUGS_PREGENERATED = FORUM_CATEGORY_SLUGS.slice(0, 8)
