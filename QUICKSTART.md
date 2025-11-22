# Быстрый старт BodyFatAI

## 1. Запуск бэкенда

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Создайте файл .env с вашим OpenAI API ключом (опционально):
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Бэкенд будет доступен на http://localhost:8000

**Важно:** Если API ключ не указан, бэкенд будет работать в режиме заглушки с простой формулой расчета.

## 2. Запуск мобильного приложения

```bash
cd mobile
npm install
npm start
```

Затем:
- Нажмите `i` для iOS симулятора
- Нажмите `a` для Android эмулятора
- Отсканируйте QR-код в Expo Go на реальном устройстве

## 3. Подключение к бэкенду на реальном устройстве

1. Узнайте IP-адрес вашего компьютера в локальной сети:
   - Windows: `ipconfig` (смотрите IPv4 адрес)
   - macOS/Linux: `ifconfig` или `ip addr`

2. Откройте `mobile/src/api/client.ts` и замените URL в функции `getApiBaseUrl()`:
   ```typescript
   return 'http://YOUR_IP_ADDRESS:8000';
   ```

3. Убедитесь, что бэкенд запущен с `--host 0.0.0.0` (уже указано в команде выше)

4. Убедитесь, что устройство и компьютер в одной Wi-Fi сети

## Тестирование без мобильного приложения

Можно протестировать API напрямую:

```bash
curl -X POST "http://localhost:8000/api/bodyfat" \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "age": 30,
    "height": 180,
    "weight": 75,
    "waist": 85
  }'
```

Или откройте http://localhost:8000/docs для интерактивной документации API.


