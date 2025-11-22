# ✅ Чеклист деплоя в App Store

## 🌐 1. Backend сервер (обязательно!)

- [ ] Выбрать хостинг (Railway/Render/DigitalOcean)
- [ ] Задеплоить backend на хостинг
- [ ] Получить HTTPS URL (например: `https://bodyfatai.railway.app`)
- [ ] Добавить переменные окружения на хостинге:
  - [ ] `OPENAI_API_KEY`
  - [ ] `OPENAI_MODEL=gpt-4o-mini`
- [ ] Протестировать API: `https://ваш-url.com/docs`
- [ ] Обновить CORS в `backend/main.py` (указать конкретные домены)

## 📱 2. Мобильное приложение

- [ ] Обновить API URL в `mobile/src/api/client.ts` (строка 26)
  - Заменить на ваш production URL с HTTPS
- [ ] Получить Production RevenueCat ключ
- [ ] Обновить ключ в `mobile/src/services/subscription.ts` (строка 8)
- [ ] Проверить Bundle ID в `mobile/app.json`: `com.bodyfatai.app`

## 💰 3. Подписки (App Store Connect)

- [ ] Создать приложение в App Store Connect
- [ ] Bundle ID: `com.bodyfatai.app`
- [ ] Создать Subscription Group "Premium"
- [ ] Создать подписку `monthly_premium` (Monthly, $4.99)
- [ ] Создать подписку `yearly_premium` (Annual, $39.99)
- [ ] Подключить App Store Connect к RevenueCat
- [ ] Создать Entitlement `premium` в RevenueCat
- [ ] Привязать продукты к entitlement

## 🏗️ 4. Сборка приложения

- [ ] Установить EAS CLI: `npm install -g eas-cli`
- [ ] Войти в Expo: `eas login`
- [ ] Настроить EAS: `eas build:configure`
- [ ] Создать production сборку: `eas build --platform ios --profile production`
- [ ] Дождаться завершения сборки

## 📤 5. Загрузка в App Store

- [ ] Загрузить через EAS: `eas submit --platform ios`
- [ ] Или через Xcode: Archive → Distribute App
- [ ] Заполнить информацию в App Store Connect:
  - [ ] Описание приложения
  - [ ] Скриншоты (минимум для iPhone 6.7")
  - [ ] Ключевые слова
  - [ ] Категория: Health & Fitness
  - [ ] App Privacy (указать использование фото и данных о здоровье)

## 🧪 6. Тестирование

- [ ] Создать Sandbox тестового пользователя в App Store Connect
- [ ] Протестировать через TestFlight:
  - [ ] Onboarding работает
  - [ ] Загрузка фото работает
  - [ ] Расчет процента жира работает
  - [ ] Подписка появляется при нажатии "Calculate"
  - [ ] "Try Free Now" работает
  - [ ] Покупка подписки работает (Sandbox)
  - [ ] Советы отображаются правильно
  - [ ] Imperial/Metric система работает

## 🚀 7. Релиз

- [ ] Все тесты пройдены
- [ ] Отправить на ревью: App Store Connect → Submit for Review
- [ ] Дождаться одобрения Apple (обычно 1-3 дня)

---

## 📝 Важные файлы для проверки:

1. **Backend URL**: `mobile/src/api/client.ts` (строка 26)
2. **RevenueCat ключ**: `mobile/src/services/subscription.ts` (строка 8)
3. **Bundle ID**: `mobile/app.json` (строка 19)
4. **CORS**: `backend/main.py` (строка 16)

## 🔗 Полезные ссылки:

- Railway: https://railway.app
- Render: https://render.com
- RevenueCat: https://app.revenuecat.com
- App Store Connect: https://appstoreconnect.apple.com
- EAS Build: https://docs.expo.dev/build/introduction/

---

**Подробные инструкции:** см. `APP_STORE_DEPLOYMENT.md`
**Быстрый старт:** см. `QUICK_DEPLOY.md`

