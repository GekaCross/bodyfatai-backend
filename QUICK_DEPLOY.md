# ⚡ Быстрый старт деплоя

## 🎯 Минимальные шаги для релиза

### 1. Деплой Backend (5 минут)

**Рекомендуется Railway.app:**

1. Зайдите на https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Выберите репозиторий и папку `backend`
4. Добавьте переменные окружения:
   ```
   OPENAI_API_KEY=ваш_ключ_openai
   OPENAI_MODEL=gpt-4o-mini
   ```
5. Скопируйте URL (например: `https://bodyfatai.railway.app`)

### 2. Обновите API URL в приложении

Откройте `mobile/src/api/client.ts`, строка 26:

```typescript
return 'https://ваш-url-с-railway.app';  // <-- Вставьте ваш URL
```

### 3. Обновите RevenueCat ключ

Откройте `mobile/src/services/subscription.ts`, строка 8:

```typescript
const REVENUECAT_API_KEY_IOS = 'appl_ВАШ_PRODUCTION_КЛЮЧ';
```

Получите ключ: RevenueCat Dashboard → Project Settings → API Keys → Public SDK Key

### 4. Создайте подписки в App Store Connect

1. App Store Connect → Ваше приложение → Subscriptions
2. Создайте группу "Premium"
3. Добавьте:
   - `monthly_premium` - Monthly - $4.99
   - `yearly_premium` - Annual - $39.99

### 5. Подключите App Store Connect к RevenueCat

RevenueCat Dashboard → Integrations → App Store Connect → Connect

### 6. Соберите приложение

```bash
cd "Body Fat/mobile"
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
```

### 7. Загрузите в App Store

```bash
eas submit --platform ios
```

Или через Xcode: Product → Archive → Distribute App

---

**Подробная инструкция:** см. `APP_STORE_DEPLOYMENT.md`

