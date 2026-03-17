# Данные для приложения Groxy

## Города России — `russia-cities.json`

**Источник:** [arbaev/russia-cities](https://github.com/arbaev/russia-cities) (лицензия в репозитории).

Используется для подсказок при выборе города в настройках профиля. Данные загружаются в таблицу Supabase `public.cities` (колонки `name`, `region`).

### Структура JSON

Каждый элемент массива:
- `name` — название населённого пункта (строка).
- `region` — объект региона:
  - `region.name` — краткое название (например, «Башкортостан»);
  - `region.fullname` — полное название (например, «Республика Башкортостан»).

Для импорта в `public.cities` нужно брать поля:
- **name** — как есть;
- **region** — `region.name` или `region.fullname` (на выбор).

### Готовый CSV — `cities.csv`

Сгенерирован из `russia-cities.json` скриптом `scripts/generate-cities-csv.js`. Колонки: `name`, `region`. Пересоздать: `node scripts/generate-cities-csv.js`.

### Импорт в Supabase

1. **Через Dashboard:** Table Editor → `cities` → Import → загрузить файл `data/cities.csv` (с заголовком name, region).
2. **Через ИИ-агента Supabase:** отправить содержимое `data/cities.csv` или ссылку на файл; попросить выполнить INSERT в `public.cities` из этого CSV (колонки name, region).
3. **Локально (psql):** `\copy public.cities(name, region) FROM 'data/cities.csv' CSV HEADER ENCODING 'UTF8'`

После импорта приложение использует функцию `public.search_cities(query)` для подсказок по вводу города.
