'use client'

import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'

export default function TermsPage() {
  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <SurfaceCard className="p-5">
        <h1 className="text-2xl font-semibold text-white">Условия использования</h1>
        <p className="mt-2 text-sm text-zinc-400">Обновлено: 02.03.2025</p>

        <section className="mt-6 space-y-4 text-sm text-zinc-300">
          <div>
            <h2 className="font-medium text-white">1. Принятие условий</h2>
            <p className="mt-1">
              Используя приложение «Groxy», вы соглашаетесь с настоящими Условиями использования. Если вы не согласны с ними, пожалуйста, не используйте приложение.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">2. Описание сервиса</h2>
            <p className="mt-1">
              Приложение предоставляет инструменты для расчётов и справочных материалов в сфере строительства, а также функции форума и сообщества для общения пользователей. Функциональность может изменяться и дополняться.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">3. Регистрация и учётная запись</h2>
            <p className="mt-1">
              Для доступа к части функций требуется регистрация. Вы несёте ответственность за сохранность учётных данных и за все действия, совершённые с вашей учётной записью. При регистрации вы обязуетесь указывать достоверные данные.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">4. Правила поведения</h2>
            <p className="mt-1">
              Запрещается размещать незаконный контент, оскорбления, спам, рекламу без согласования, вредоносный код или материалы, нарушающие права третьих лиц. Мы оставляем за собой право удалять такой контент и ограничивать доступ к сервису.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">5. Интеллектуальная собственность</h2>
            <p className="mt-1">
              Приложение, его интерфейс и материалы, предоставленные разработчиком, защищены авторским правом. Контент, созданный пользователями (посты, расчёты, проекты), остаётся в их собственности при условии соблюдения настоящих Условий и Политики конфиденциальности.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">6. Ограничение ответственности</h2>
            <p className="mt-1">
              Приложение предоставляется «как есть». Расчёты и справочные данные носят информационный характер. Разработчик не несёт ответственности за решения, принятые на их основе, за убытки или претензии, связанные с использованием или невозможностью использования приложения.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">7. Изменения и прекращение</h2>
            <p className="mt-1">
              Мы можем изменять Условия использования; актуальная версия публикуется на этой странице. Продолжение использования приложения после изменений означает принятие новых условий. Мы вправе приостановить или прекратить предоставление сервиса в соответствии с применимым законодательством.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">8. Применимое право</h2>
            <p className="mt-1">
              К настоящим Условиям и использованию приложения применяется законодательство Российской Федерации. Споры разрешаются в соответствии с действующим законодательством.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-white">9. Связь с Политикой конфиденциальности</h2>
            <p className="mt-1">
              Обработка персональных данных регулируется отдельной <Link href="/privacy" className="text-zinc-300 hover:text-white underline">Политикой конфиденциальности</Link>. Используя приложение, вы также соглашаетесь с её положениями.
            </p>
          </div>
        </section>

        <p className="mt-6 text-sm text-zinc-400">
          <Link href="/privacy" className="text-zinc-300 hover:text-white">Политика конфиденциальности</Link>
        </p>

        <BackButton fallbackHref="/" className="mt-8 inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          На главную
        </BackButton>
      </SurfaceCard>
    </AppPage>
  )
}
