# Сохранение проекта и генерация PDF

Документация по реализации сохранения проекта и генерации PDF в приложении Groxy.

---

## Сохранение проекта

### Два хранилища

1. **Supabase** — `lib/projects/supabaseProjects.ts`
   - `saveProjectToSupabase(supabase, project)` — insert или update в таблицу `user_projects`.
   - По `user_id` и `id` (uuid). В `payload` уходят: `name`, `type`, `data`, `pdfFilename`, `pdfComment`, `notes`, `foundation`, `roof`, `resultsOverrides`.

2. **Устройство (Android)** — `lib/projects/deviceProjects.ts`
   - `saveProjectToDevice(project)` — только если платформа Android и выставлен флаг `window.__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ === true` (явное действие пользователя).
   - Вызов нативного `NativeStorage.saveProject(JSON.stringify(project))`.

### Где вызывается сохранение

- **Страница просмотра** `app/(protected)/projects/view/page.tsx`:
  - `handleSaveProject()` собирает объект через `buildProjectFromViewState()` (фундамент, стены, крыша, комментарии, заметки, переопределения результатов), затем:
    - при Supabase-id: `saveProjectToSupabase(supabase, toSave)`;
    - затем `saveProjectToDevice(toSave)` (если разрешено).
  - Кнопка «Сохранить» вызывает `handleSaveProject()`; активна при `isSaveProjectActive` (есть изменения или данные секций).

- **Создание проекта (walls-2/3/4)** — в калькуляторах (`WallsCalculator.tsx`, `walls3Calculator.tsx`, `walls4Calculator.tsx`):
  - Локальная функция `persistProject(forceOverwrite?, overwriteId?)`:
    - проверяет `hasRequired` и флаг явного действия пользователя (`userInitiatedSaveRef`);
    - собирает проект из state + `sessionStorage` (имя, стены, фундамент, `pdfComment`, `notes`, `resultsOverrides`);
    - на Android — `saveProjectToDevice(p)`, иначе — `upsertLocalProject(p)` из `lib/projects/localProjects`.
  - `saveProjectOnly()` и `checkDuplicateAndSaveProject()` вызывают `persistProject()`; при перезаписи дубликата передаётся `overwriteId`.

- **Сохранение из sessionStorage (без UI калькулятора)** — `lib/projects/persistProjectFromStorage.ts`:
  - `persistProjectFromStorageWalls2/3/4(overwriteProjectId?)` читают данные из `sessionStorage` (имя, данные стен, фундамент, крыша и т.д.), проверяют дубликаты по имени, затем сохраняют через `saveProjectToDevice` или `upsertLocalProject`. Используются из `ProjectHub` и из `lib/pdf/runSavePdfFromStorage.ts` при генерации/сохранении PDF.

### Важно (правило проекта)

**Проект** включает: фундамент, стены, крышу, комментарии/заметки. При сохранении, флаге «есть изменения» (dirty), кнопке дискеты и проверках «изменился ли проект» учитывать изменения во **всех** этих частях.

---

## Генерация PDF

### Ядро

1. **`lib/pdf/generatePdfClient.ts`**
   - `generatePdfClient(data: PdfData): Promise<Uint8Array>`:
     - создаёт документ через `pdf-lib` (PDFDocument), подключает шрифт (NotoSans/Roboto);
     - по полям `PdfData` (заголовок, стены/фундамент/крыша, комментарий, переопределения результатов, опционально `planImages`) рисует страницы (текст, таблицы, при необходимости вставляет изображения планов из `planImages`).
   - `PdfData` бывает «с стенами» (материал, размеры, проёмы, результаты) или `skipWalls: true` (только фундамент/крыша/комментарий).

2. **Планы как картинки**
   - **`app/components/PdfPlanCapture.tsx`**:
     - `generatePdfWithPlanCapture(type, payload)` монтирует скрытый контейнер с компонентами `DetailPlan*` (фундамент, стены, крыша для walls_2/3/4).
     - После задержки (~700 ms) через `html-to-image` (`toPng`) снимает элементы `[data-pdf-plan="foundation"]`, `[data-pdf-plan="walls"]`, `[data-pdf-plan="roof"]` в `planImages`.
     - Вызывает `generatePdfClient({ ...payload, planImages })`; при ошибке — fallback без `planImages`.

### Где вызывается генерация

- **WallsCalculator (walls-2)** — при нажатии «Скачать PDF»: собирается `payload` из state/sessionStorage, вызывается `generatePdfWithPlanCapture('walls_2', payload)`; PDF не триггерит `persistProject`/сохранение.
- **walls3Calculator / walls4Calculator** — аналогично: `generatePdfWithPlanCapture('walls_3' | 'walls_4', payload)`.
- **Страница просмотра** `app/(protected)/projects/view/page.tsx` — при экспорте PDF собирается `fullPayload` (проект + фундамент + крыша + переопределения), для стеновых типов при наличии рендера планов в `planImages` передаётся `generatePdfClient({ ...payload, planImages })`, иначе — `generatePdfClient(payload)`.
- **LocalProjectsList** — `generatePdf(project)` подготавливает данные из проекта и вызывает либо `generatePdfWithPlanCapture`, либо `generatePdfClient` в зависимости от типа; на Android может сохранять файл на устройство.
- **runSavePdfFromStorage** — `generateAndStorePdfWalls3/4`, `runSavePdfFromStorage` (walls_2): при необходимости сначала сохраняют проект через `persistProjectFromStorage*`, затем генерируют PDF через `generatePdfWithPlanCapture` или `generatePdfClient` и сохраняют PDF (storage/файл).

### Ключевые файлы

| Назначение | Файл |
|------------|------|
| Сохранение в Supabase | `lib/projects/supabaseProjects.ts` |
| Сохранение на устройство (Android) | `lib/projects/deviceProjects.ts` |
| Локальные проекты (web) | `lib/projects/localProjects.ts` |
| Сохранение из sessionStorage | `lib/projects/persistProjectFromStorage.ts` |
| Генерация PDF (клиент) | `lib/pdf/generatePdfClient.ts` |
| Захват планов для PDF | `app/components/PdfPlanCapture.tsx` |
| Генерация и сохранение PDF из storage | `lib/pdf/runSavePdfFromStorage.ts` |

---

*Документ создан для сохранения контекста при перезагрузке Cursor.*
