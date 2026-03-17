-- Категории форума: «Дом и стройка» и «Инженерные системы».
-- Выполнить в Supabase → SQL Editor после forum_schema.sql.
-- Использует ON CONFLICT: существующие slug обновляются, новые добавляются.

insert into forum_categories (name, slug, sort_order) values
  ('Материалы для строительства', 'stroitelnye-materialy', 1),
  ('Инструмент и техника', 'instrumenty-i-oborudovanie', 2),
  ('Фундаменты', 'fundamenty', 3),
  ('Крыша и кровля', 'krovli-i-krovelnye-materialy', 4),
  ('Окна и остекление', 'okna-profili-osteklenie', 5),
  ('Фасад и отделка', 'fasady-i-fasadnye-materialy', 6),
  ('Проекты домов', 'proekty-domov-i-kottedzhey', 7),
  ('Строим дом', 'stroitelstvo-doma-kottedzha', 8),
  ('Бани', 'stroitelstvo-bani', 9),
  ('Сараи и хозпостройки', 'hozyaystvennye-postroyki', 10),
  ('Заборы и ворота', 'zabory-vorota-ograzhdeniya', 11),
  ('Домашняя автоматизация', 'umnyy-dom', 12),
  ('Печи, камины', 'pechi-i-kaminy', 13),
  ('Системы отопления', 'otoplenie', 14),
  ('Вода и водопровод', 'vodosnabzhenie', 15),
  ('Канализация, дренаж', 'kanalizaciya-i-drenazh', 16),
  ('Вентиляция и кондиционирование', 'ventilyaciya', 17),
  ('Газ', 'gazosnabzhenie', 18),
  ('Электропроводка и электрика', 'elektrika', 19),
  ('Беседка', 'besedka', 20)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;
