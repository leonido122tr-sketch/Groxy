/** Разделы базы знаний: slug -> заголовок и описание */
export const KNOWLEDGE_PAGES: Record<string, { title: string; description: string }> = {
  concrete: { title: 'Бетон', description: 'Марки, классы прочности, применение, расчёт количества' },
  metal: { title: 'Металл', description: 'Металлопрокат, арматура, крепёж, антикоррозия' },
  wood: { title: 'Дерево', description: 'Пиломатериалы, брус, доска, защита и обработка' },
  glass: { title: 'Стекло', description: 'Виды остекления, стеклопакеты, безопасность' },
  insulation: { title: 'Материалы для утепления', description: 'Теплоизоляция стен, кровли, пола, паропроницаемость' },
  brick: { title: 'Кирпич и кладочные материалы', description: 'Керамика, блоки, растворы, кладка' },
  roof: { title: 'Кровля и гидроизоляция', description: 'Покрытия, плёнки, мембраны, узлы примыканий' },
  foundation: { title: 'Фундаменты', description: 'Типы фундаментов, бетон, арматура, гидроизоляция' },
  finishing: { title: 'Отделочные материалы', description: 'Штукатурки, шпаклёвки, гипсокартон, плитка' },
  paint: { title: 'Лакокрасочные материалы', description: 'Краски, грунты, пропитки по типам оснований' },
  fasteners: { title: 'Крепёж и метизы', description: 'Анкеры, дюбели, саморезы под разные материалы' },
  standards: { title: 'Нормы и СНиПы', description: 'Тепловая защита, несущие конструкции, пожарная безопасность' },
}

export const KNOWLEDGE_SLUGS = Object.keys(KNOWLEDGE_PAGES) as string[]
