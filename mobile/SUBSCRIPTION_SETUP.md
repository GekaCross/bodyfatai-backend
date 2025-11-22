# Настройка подписок для BodyFatAI

Это руководство поможет вам настроить систему подписок через RevenueCat для вашего iOS приложения.

## Шаг 1: Создание аккаунта RevenueCat

1. Зайдите на https://app.revenuecat.com
2. Создайте бесплатный аккаунт
3. Создайте новый проект для вашего приложения

## Шаг 2: Настройка App Store Connect

1. Войдите в App Store Connect (https://appstoreconnect.apple.com)
2. Выберите ваше приложение
3. Перейдите в раздел **Subscriptions** (Подписки)
4. Создайте группу подписок (например, "Premium")
5. Создайте подписки:
   - **Monthly Premium** (месячная)
   - **Annual Premium** (годовая)
   - При необходимости: **6-Month Premium** (полугодовая)

6. Для каждой подписки:
   - Установите цену
   - Добавьте описание
   - Настройте периоды бесплатного пробного периода (опционально)

## Шаг 3: Настройка RevenueCat

1. В RevenueCat перейдите в **Products** (Продукты)
2. Нажмите **Add Product** и создайте продукт с ID:
   - `monthly_premium` (для месячной подписки)
   - `yearly_premium` (для годовой подписки)

3. Создайте **Entitlement** (право доступа):
   - Название: `premium`
   - Это будет использоваться для проверки активной подписки

4. Создайте **Offering** (Предложение):
   - Название: `default`
   - Добавьте пакеты (Packages):
     - Monthly: привяжите к `monthly_premium`
     - Annual: привяжите к `yearly_premium`

5. Получите API ключи:
   - Перейдите в **Project Settings** → **API Keys**
   - Скопируйте **Public API Key** для iOS

## Шаг 4: Настройка кода

1. Откройте файл `src/services/subscription.ts`
2. Замените `YOUR_IOS_API_KEY` на ваш iOS API ключ из RevenueCat:
   ```typescript
   const REVENUECAT_API_KEY_IOS = 'appl_YOUR_ACTUAL_KEY_HERE';
   ```

3. Если планируете Android, замените `YOUR_ANDROID_API_KEY` на Android ключ

## Шаг 5: Установка зависимостей

```bash
cd mobile
npm install
```

## Шаг 6: Настройка app.json

Убедитесь, что в `app.json` указан правильный `bundleIdentifier`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.bodyfatai.app"
    }
  }
}
```

## Шаг 7: Тестирование

### Тестирование в симуляторе:
1. Запустите приложение: `npm start`
2. Откройте на iOS симуляторе
3. RevenueCat автоматически использует тестовую среду

### Тестирование на реальном устройстве:
1. Используйте тестовый аккаунт Sandbox в App Store
2. Создайте тестового пользователя в App Store Connect:
   - Users and Access → Sandbox Testers → Add New Tester

## Шаг 8: Проверка работы

1. При запуске приложения должна произойти инициализация RevenueCat
2. Нажмите кнопку "Upgrade to Premium"
3. Должен открыться экран с доступными подписками
4. Попробуйте купить подписку (используя тестовый аккаунт)
5. После покупки статус должен измениться на "✓ Premium"

## Важные замечания

1. **ID подписок должны совпадать** в App Store Connect и RevenueCat
2. **Entitlement ID** (`premium`) используется в коде для проверки подписки
3. **Offering ID** должен быть `default` или обновите код в `subscription.ts`
4. Для продакшена убедитесь, что используете правильные API ключи

## Дополнительные настройки

### Изменение ID подписок:
Если вы хотите использовать другие ID, обновите:
- `SUBSCRIPTION_IDS` в `src/services/subscription.ts`
- Соответствующие ID в RevenueCat и App Store Connect

### Изменение Entitlement ID:
Если вы хотите использовать другое имя для entitlement:
1. Измените `'premium'` на ваше имя в:
   - `src/services/subscription.ts` (все места, где используется `'premium'`)
   - `src/screens/SubscriptionScreen.tsx`

## Поддержка

Если возникли проблемы:
1. Проверьте логи в консоли
2. Убедитесь, что API ключи правильные
3. Проверьте, что подписки созданы в App Store Connect
4. Убедитесь, что Offering настроен в RevenueCat

