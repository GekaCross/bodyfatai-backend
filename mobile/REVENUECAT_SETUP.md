# Настройка RevenueCat для React Native/Expo

## Важно! 

RevenueCat показывает инструкции для **нативного iOS (Swift)**, но у нас **React Native/Expo** приложение. Используйте инструкции ниже.

## Шаг 1: API ключ уже добавлен

API ключ `test_sTsrhXMKJMmNrYrUdNBjGGYdEbt` уже добавлен в `src/services/subscription.ts`.

## Шаг 2: Настройка в RevenueCat Dashboard

1. В RevenueCat Dashboard перейдите в **Products** (Продукты)
2. Создайте продукты с ID:
   - `monthly_premium` (для месячной подписки)
   - `yearly_premium` (для годовой подписки)

3. Создайте **Entitlement** (право доступа):
   - Название: `premium`
   - Это будет использоваться для проверки активной подписки

4. Создайте **Offering** (Предложение):
   - Название: `default` (важно!)
   - Добавьте пакеты (Packages):
     - Monthly: привяжите к `monthly_premium`
     - Annual: привяжите к `yearly_premium`

## Шаг 3: Настройка App Store Connect

1. Войдите в App Store Connect: https://appstoreconnect.apple.com
2. Выберите ваше приложение
3. Перейдите в раздел **Subscriptions** (Подписки)
4. Создайте группу подписок (например, "Premium")
5. Создайте подписки:
   - **Product ID**: `monthly_premium`
   - **Product ID**: `yearly_premium`
6. Установите цены для каждой подписки

## Шаг 4: Связывание App Store Connect с RevenueCat

1. В RevenueCat перейдите в **Integrations**
2. Нажмите **Connect** рядом с App Store Connect
3. Следуйте инструкциям для подключения
4. После подключения ваши подписки из App Store Connect появятся в RevenueCat

## Шаг 5: Тестирование

### В симуляторе:
```bash
cd mobile
npm start
```

### На реальном устройстве:
1. Создайте тестового пользователя в App Store Connect:
   - Users and Access → Sandbox Testers → Add New Tester
2. Войдите в App Store на устройстве с тестовым аккаунтом
3. Запустите приложение
4. Попробуйте купить подписку

## Проверка работы

1. При запуске приложения должна произойти инициализация RevenueCat (проверьте консоль)
2. Нажмите кнопку "Upgrade to Premium" в приложении
3. Должен открыться экран с доступными подписками
4. Попробуйте купить подписку (используя тестовый аккаунт)

## Важные замечания

- **API ключ**: `test_sTsrhXMKJMmNrYrUdNBjGGYdEbt` - это тестовый ключ, для продакшена получите production ключ
- **Offering ID**: должен быть `default` (как в коде)
- **Entitlement ID**: должен быть `premium` (как в коде)
- **Product IDs**: должны совпадать в App Store Connect и RevenueCat

## Если что-то не работает

1. Проверьте логи в консоли приложения
2. Убедитесь, что Offering создан с названием `default`
3. Убедитесь, что Entitlement создан с названием `premium`
4. Проверьте, что подписки созданы в App Store Connect
5. Убедитесь, что App Store Connect подключен к RevenueCat

