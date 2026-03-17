/** Разделы базы знаний: slug -> заголовок, описание, картинка раздела (jpg в public/knowledge/, лёгкие). */
export const KNOWLEDGE_PAGES: Record<
  string,
  { title: string; description: string; imageUrl?: string }
> = {
  concrete: {
    title: 'Бетон',
    description: 'Марки, классы прочности, применение, расчёт количества',
    imageUrl: '/knowledge/concrete.jpg',
  },
  metal: {
    title: 'Металл',
    description: 'Металлопрокат, арматура, крепёж, антикоррозия',
    imageUrl: '/knowledge/metal.jpg',
  },
  wood: {
    title: 'Дерево',
    description: 'Пиломатериалы, брус, доска, защита и обработка',
    imageUrl: '/knowledge/wood.jpg',
  },
  glass: {
    title: 'Стекло',
    description: 'Виды остекления, стеклопакеты, безопасность',
    imageUrl: '/knowledge/glass.jpg',
  },
  insulation: {
    title: 'Материалы для утепления',
    description: 'Теплоизоляция стен, кровли, пола, паропроницаемость',
    imageUrl: '/knowledge/insulation.jpg',
  },
  brick: {
    title: 'Кирпич и кладочные материалы',
    description: 'Керамика, блоки, растворы, кладка',
    imageUrl: '/knowledge/brick.jpg',
  },
  roof: {
    title: 'Кровля и гидроизоляция',
    description: 'Покрытия, плёнки, мембраны, узлы примыканий',
    imageUrl: '/knowledge/roof.jpg',
  },
  foundation: {
    title: 'Фундаменты',
    description: 'Типы фундаментов, бетон, арматура, гидроизоляция',
    imageUrl: '/knowledge/foundation.jpg',
  },
  finishing: {
    title: 'Отделочные материалы',
    description: 'Штукатурки, шпаклёвки, гипсокартон, плитка',
    imageUrl: '/knowledge/finishing.jpg',
  },
  paint: {
    title: 'Лакокрасочные материалы',
    description: 'Краски, грунты, пропитки по типам оснований',
    imageUrl: '/knowledge/paint.jpg',
  },
  fasteners: {
    title: 'Крепёж и метизы',
    description: 'Анкеры, дюбели, саморезы под разные материалы',
    imageUrl: '/knowledge/fasteners.jpg',
  },
  standards: {
    title: 'Нормы и СНиПы',
    description: 'Тепловая защита, несущие конструкции, пожарная безопасность',
    imageUrl: '/knowledge/standards.jpg',
  },
}

export const KNOWLEDGE_SLUGS = Object.keys(KNOWLEDGE_PAGES) as string[]

/** Подмножество slug'ов для прегенерации при сборке. Остальные разделы открываются по клику; прямой URL/обновление могут дать 404. Чтобы прегенерировать все — используйте KNOWLEDGE_SLUGS. */
export const KNOWLEDGE_SLUGS_PREGENERATED = KNOWLEDGE_SLUGS.slice(0, 6)
