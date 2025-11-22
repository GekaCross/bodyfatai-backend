from models import BodyFatRequest, BodyFatResponse, AdviceRequest, AdviceResponse
from config import settings
from openai import OpenAI
import json
import re
import base64
from io import BytesIO
from PIL import Image
import httpx


async def calculate_body_fat(request: BodyFatRequest) -> BodyFatResponse:
    """
    Calculate body fat percentage using OpenAI API.
    Returns structured response with body fat percentage and comment.
    """
    
    # Если API ключ не установлен, возвращаем заглушку для тестирования
    if not settings.openai_api_key:
        return _get_mock_response(request)
    
    # Инициализируем клиент OpenAI
    # Удаляем переменные окружения прокси, чтобы избежать конфликта с httpx
    import os
    
    # Сохраняем и удаляем прокси переменные
    proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
    saved_proxies = {}
    for var in proxy_vars:
        if var in os.environ:
            saved_proxies[var] = os.environ[var]
            del os.environ[var]
    
    try:
        # Создаем клиент без передачи http_client - пусть OpenAI создаст свой
        # Это должно избежать проблемы с proxies параметром
        client = OpenAI(api_key=settings.openai_api_key)
    finally:
        # Восстанавливаем прокси переменные
        for var, value in saved_proxies.items():
            os.environ[var] = value
    
    # Формируем промпт
    system_prompt = """You are an expert in body composition analysis. 
Your task is to estimate body fat percentage based on provided anthropometric data.

You must respond ONLY with a valid JSON object in this exact format:
{
    "body_fat_percent": <number between 0 and 100>,
    "comment": "<brief comment in 1-3 sentences, in English>"
}

Rules:
- body_fat_percent: a single number (float), no additional text
- comment: brief, informative, in English, no medical diagnoses
- Consider gender, age, height, weight, and waist circumference (if provided)
- Use standard body fat estimation formulas (e.g., Deurenberg, Jackson-Pollock) as reference
- Do not provide any text outside the JSON object"""

    user_prompt = f"""Calculate body fat percentage for:
- Gender: {request.gender}
- Age: {request.age} years
- Height: {request.height} cm
- Weight: {request.weight} kg
{f"- Waist circumference: {request.waist} cm" if request.waist else ""}

Respond with JSON only."""

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,  # Минимальная температура для максимальной стабильности
            response_format={"type": "json_object"},  # Принудительный JSON формат
            seed=42  # Фиксированный seed для детерминированных результатов
        )
        
        content = response.choices[0].message.content
        if not content:
            raise Exception("Empty response from OpenAI API")
        
        result = json.loads(content)
        
        # Валидация и извлечение данных
        body_fat_percent = float(result.get("body_fat_percent", 0))
        comment = result.get("comment", "Calculation completed.")
        
        # Определяем оценку на основе процента жира
        evaluation = _get_evaluation(body_fat_percent, request.gender)
        
        # Ограничиваем процент жира разумными значениями
        body_fat_percent = max(0, min(100, body_fat_percent))
        
        return BodyFatResponse(
            body_fat_percent=round(body_fat_percent, 1),
            comment=comment,
            evaluation=evaluation
        )
        
    except json.JSONDecodeError as e:
        # Если не удалось распарсить JSON, пытаемся извлечь число из текста
        content = response.choices[0].message.content if response and response.choices else ""
        return _parse_fallback_response(content, request)
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")


def _get_evaluation(percent: float, gender: str) -> str:
    """Determines body fat percentage evaluation"""
    if gender == "male":
        if percent < 10:
            return "Very Low"
        elif percent < 15:
            return "Low (Athletic)"
        elif percent < 20:
            return "Normal"
        elif percent < 25:
            return "Above Average"
        else:
            return "High"
    else:
        if percent < 16:
            return "Very Low"
        elif percent < 20:
            return "Low (Athletic)"
        elif percent < 25:
            return "Normal"
        elif percent < 32:
            return "Above Average"
        else:
            return "High"


def _get_mock_response(request: BodyFatRequest) -> BodyFatResponse:
    """
    Mock response for testing without OpenAI API key.
    Uses simple estimation formula as fallback.
    """
    # Простая формула для демонстрации (формула Деуренберга)
    bmi = request.weight / ((request.height / 100) ** 2)
    
    if request.gender == "male":
        body_fat = (1.20 * bmi) + (0.23 * request.age) - 16.2
    else:
        body_fat = (1.20 * bmi) + (0.23 * request.age) - 5.4
    
    # Корректировка с учетом обхвата талии, если предоставлен
    if request.waist:
        if request.gender == "male":
            body_fat += (request.waist / request.height) * 10
        else:
            body_fat += (request.waist / request.height) * 8
    
    body_fat = max(5, min(50, body_fat))  # Ограничиваем разумными значениями
    
    evaluation = _get_evaluation(body_fat, request.gender)
    
    comment = f"Estimated body fat percentage calculated based on your parameters. "
    if body_fat < 10:
        comment += "Very low body fat percentage, typical for athletes."
    elif body_fat < 20:
        comment += "Low body fat percentage, good physical condition."
    elif body_fat < 25:
        comment += "Normal body fat percentage for a healthy person."
    else:
        comment += "Elevated body fat percentage, consultation with a specialist is recommended."
    
    return BodyFatResponse(
        body_fat_percent=round(body_fat, 1),
        comment=comment,
        evaluation=evaluation
    )


def _parse_fallback_response(content: str, request: BodyFatRequest) -> BodyFatResponse:
    """
    Fallback parser if JSON parsing fails.
    Tries to extract body fat percentage from text.
    """
    # Пытаемся найти число в тексте
    numbers = re.findall(r'\d+\.?\d*', content)
    body_fat = float(numbers[0]) if numbers else 20.0
    
    return BodyFatResponse(
        body_fat_percent=round(max(0, min(100, body_fat)), 1),
        comment="Calculation completed. " + content[:100]  # First 100 characters as comment
    )


def _encode_image_to_base64(image_data: bytes, content_type: str) -> str:
    """
    Encode image to base64 string for GPT-4 Vision API.
    """
    # Если изображение уже в правильном формате, просто кодируем
    # Иначе конвертируем через PIL
    try:
        if content_type and content_type.startswith('image/'):
            # Пытаемся открыть и оптимизировать изображение
            img = Image.open(BytesIO(image_data))
            
            # Конвертируем в RGB если нужно (для JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            
            # Сохраняем в буфер
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85, optimize=True)
            image_data = buffer.getvalue()
        
        return base64.b64encode(image_data).decode('utf-8')
    except Exception as e:
        # Если не удалось обработать, просто кодируем как есть
        return base64.b64encode(image_data).decode('utf-8')


async def calculate_body_fat_with_image(
    request: BodyFatRequest, 
    image_data_list: list[bytes], 
    content_type_list: list[str]
) -> BodyFatResponse:
    """
    Calculate body fat percentage using OpenAI GPT-4 Vision API with image analysis.
    Combines user input parameters with visual analysis from multiple photos.
    """
    
    # Если API ключ не установлен, используем обычный расчет
    if not settings.openai_api_key:
        print("WARNING: OpenAI API key not set, using fallback calculation")
        return _get_mock_response(request)
    
    print(f"Using OpenAI API key: {settings.openai_api_key[:20]}...")
    print(f"Processing {len(image_data_list)} image(s)")
    
    # Инициализируем клиент OpenAI
    # Удаляем переменные окружения прокси, чтобы избежать конфликта с httpx
    import os
    
    # Сохраняем и удаляем прокси переменные
    proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
    saved_proxies = {}
    for var in proxy_vars:
        if var in os.environ:
            saved_proxies[var] = os.environ[var]
            del os.environ[var]
    
    try:
        # Создаем клиент без передачи http_client - пусть OpenAI создаст свой
        # Это должно избежать проблемы с proxies параметром
        client = OpenAI(api_key=settings.openai_api_key)
    finally:
        # Восстанавливаем прокси переменные
        for var, value in saved_proxies.items():
            os.environ[var] = value
    
    # Кодируем все изображения в base64
    base64_images = []
    mime_types = []
    for i, image_data in enumerate(image_data_list):
        content_type = content_type_list[i] if i < len(content_type_list) else "image/jpeg"
        base64_images.append(_encode_image_to_base64(image_data, content_type))
        mime_types.append(content_type if content_type else "image/jpeg")
    
    # Формируем промпт для анализа изображения
    system_prompt = """You are an expert in body composition analysis and visual assessment of body fat percentage.
Your task is to estimate body fat percentage by analyzing a photo of a person combined with their anthropometric data.

You must respond ONLY with a valid JSON object in this exact format:
{
    "body_fat_percent": <number between 0 and 100>,
    "comment": "<brief comment in 1-3 sentences, in English, explaining the analysis>",
    "evaluation": "<one of: Very Low, Low (Athletic), Normal, Above Average, High>"
}

CRITICAL RULES FOR ACCURACY:
1. Be CONSERVATIVE and REALISTIC - most people underestimate body fat. Average body fat for men is 18-24%, for women 25-31%
2. Visual assessment is often MORE accurate than formulas - trust what you see in the photo
3. Look for these indicators:
   - Visible fat deposits (especially abdomen, love handles, chest, thighs)
   - Muscle definition (visible abs = lower body fat, no definition = higher body fat)
   - Body shape and proportions
   - Skin appearance and texture
4. If you see visible fat deposits, the body fat is likely 20% or higher
5. If abs are not visible at all, body fat is typically 18%+ for men, 25%+ for women
6. Combine visual assessment with anthropometric data, but prioritize visual cues
7. Be honest and accurate - do not underestimate

- body_fat_percent: a single number (float), be realistic and accurate
- comment: brief, informative, in English, mention specific visual indicators you observed
- evaluation: one of "Very Low", "Low (Athletic)", "Normal", "Above Average", "High" based on:
  * For men: <10% = Very Low, 10-15% = Low, 15-20% = Normal, 20-25% = Above Average, >25% = High
  * For women: <16% = Very Low, 16-20% = Low, 20-25% = Normal, 25-32% = Above Average, >32% = High
- Do not provide any text outside the JSON object"""

    bmi = request.weight / ((request.height/100)**2)
    
    user_prompt = f"""Analyze {"these photos" if len(image_data_list) > 1 else "this photo"} and calculate body fat percentage for:
- Gender: {request.gender}
- Age: {request.age} years
- Height: {request.height} cm
- Weight: {request.weight} kg
- BMI: {bmi:.1f}
{f"- Waist circumference: {request.waist} cm" if request.waist else ""}

SYSTEMATIC ANALYSIS APPROACH:

STEP 1: Calculate baseline using Deurenberg formula:
- BMI = {bmi:.1f}
- Baseline body fat ≈ {1.20 * bmi + 0.23 * request.age - (16.2 if request.gender == 'male' else 5.4):.1f}%

STEP 2: Visual assessment from {"photos" if len(image_data_list) > 1 else "photo"} (THIS IS CRITICAL):
Carefully examine {"all photos" if len(image_data_list) > 1 else "the photo"} and assess:
- Visible fat deposits: abdomen, love handles, chest, arms, thighs
- Muscle definition: are abs visible? Are muscles defined?
- Body shape: overall proportions and fat distribution
- Skin appearance: smoothness, texture, visible fat under skin

STEP 3: Combine both approaches:
- If visual assessment shows MORE fat than baseline suggests → use higher value
- If visual assessment shows LESS fat than baseline suggests → use lower value
- PRIORITIZE visual assessment over formulas - photos don't lie

STEP 4: Realistic ranges:
- For men: 15-20% = athletic, 20-25% = average, 25%+ = above average
- For women: 20-25% = athletic, 25-30% = average, 30%+ = above average
- If you see visible fat deposits, body fat is likely 20%+ for men, 25%+ for women

IMPORTANT: Be HONEST and REALISTIC. Most people underestimate body fat. If you see fat in the photo, reflect that in your estimate.

Provide a CONSISTENT, ACCURATE, and REALISTIC estimate.

Respond with JSON only."""

    try:
        # Формируем контент с текстом и всеми изображениями
        user_content = [{"type": "text", "text": user_prompt}]
        for i, base64_image in enumerate(base64_images):
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_types[i]};base64,{base64_image}"
                }
            })
        
        response = client.chat.completions.create(
            model="gpt-4o",  # Используем GPT-4o для vision capabilities
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": user_content
                }
            ],
            temperature=0.0,  # Минимальная температура для максимальной стабильности и детерминированности
            response_format={"type": "json_object"},
            seed=42  # Фиксированный seed для детерминированных результатов
        )
        
        content = response.choices[0].message.content
        if not content:
            raise Exception("Empty response from OpenAI API")
        
        result = json.loads(content)
        
        # Валидация и извлечение данных
        body_fat_percent = float(result.get("body_fat_percent", 0))
        comment = result.get("comment", "Calculation completed based on photo and parameters.")
        evaluation = result.get("evaluation", "Normal")
        
        # Ограничиваем процент жира разумными значениями
        body_fat_percent = max(0, min(100, body_fat_percent))
        
        return BodyFatResponse(
            body_fat_percent=round(body_fat_percent, 1),
            comment=comment,
            evaluation=evaluation
        )
        
    except json.JSONDecodeError as e:
        # Если не удалось распарсить JSON, используем обычный расчет
        print(f"JSON decode error in image analysis: {e}")
        return await calculate_body_fat(request)
    except Exception as e:
        # В случае ошибки с фото, используем обычный расчет без фото
        print(f"Error in image analysis, falling back to regular calculation: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return await calculate_body_fat(request)


def _calculate_time_estimates(current_percent: float, target_percent: float, gender: str) -> list[dict]:
    """
    Рассчитывает реалистичные временные рамки для снижения процента жира.
    Использует единую формулу: безопасное снижение 0.5-1% в месяц.
    """
    estimates = []
    
    # Определяем безопасную скорость снижения на основе текущего процента
    # Чем выше процент жира, тем быстрее можно снижать в начале
    if current_percent > 25:
        monthly_reduction = 1.0  # 1% в месяц при высоком проценте
    elif current_percent > 20:
        monthly_reduction = 0.75  # 0.75% в месяц при среднем-высоком (22.5% -> 0.75%/мес)
    else:
        monthly_reduction = 0.5  # 0.5% в месяц при низком проценте (сложнее снижать)
    
    # Создаем промежуточные цели с шагом примерно 1.5-2%
    percent = current_percent
    total_months = 0
    
    # Пока не достигли целевого процента
    while percent > target_percent:
        # Определяем следующий процент (шаг 1.5-2%)
        step_size = 1.5 if percent > 20 else 1.0  # Меньшие шаги при низком проценте
        next_percent = max(target_percent, percent - step_size)
        
        # Рассчитываем время для этого этапа по единой формуле
        reduction_needed = percent - next_percent
        months_needed = max(1, round(reduction_needed / monthly_reduction))
        total_months += months_needed
        
        estimates.append({
            "percent": round(next_percent, 1),
            "months": total_months
        })
        
        percent = next_percent
        
        # Ограничиваем количество этапов
        if len(estimates) >= 6:
            break
    
    # Если последняя цель не совпадает с целевым процентом, добавляем финальную цель
    if estimates and estimates[-1]["percent"] > target_percent:
        final_reduction = estimates[-1]["percent"] - target_percent
        final_months = max(1, round(final_reduction / monthly_reduction))
        estimates.append({
            "percent": round(target_percent, 1),
            "months": estimates[-1]["months"] + final_months
        })
    
    return estimates if estimates else [{"percent": round(current_percent, 1), "months": 0}]


async def generate_advice(request: AdviceRequest) -> AdviceResponse:
    """
    Generate personalized advice for body fat management based on current body fat percentage.
    """
    
    # Если API ключ не установлен, возвращаем заглушку
    if not settings.openai_api_key:
        return _get_mock_advice(request)
    
    # Инициализируем клиент OpenAI
    import os
    
    # Сохраняем и удаляем прокси переменные
    proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
    saved_proxies = {}
    for var in proxy_vars:
        if var in os.environ:
            saved_proxies[var] = os.environ[var]
            del os.environ[var]
    
    try:
        client = OpenAI(api_key=settings.openai_api_key)
    finally:
        # Восстанавливаем прокси переменные
        for var, value in saved_proxies.items():
            os.environ[var] = value
    
    system_prompt = """You are an expert fitness and nutrition coach specializing in body composition management.
Your task is to provide personalized, practical, and actionable advice for managing body fat percentage.

You must respond ONLY with a valid JSON object in this exact format:
{
    "title": "<title in English, e.g., 'Tips for Reducing Body Fat' or 'Recommendations for Maintaining Fitness'>",
    "sections": [
        {
            "title": "<section title in English>",
            "content": "<detailed content in English, can be multiple paragraphs separated by \\n>",
            "macros": {
                "calories": {"min": <number>, "max": <number>, "goal": "<Gain/Lose/Maintain>"},
                "protein": {"percent": <number 0-100>, "grams": <number>},
                "carbs": {"percent": <number 0-100>, "grams": <number>},
                "fats": {"percent": <number 0-100>, "grams": <number>}
            }
        }
    ],
    
IMPORTANT for Nutrition section:
- If the section title is "Nutrition" or contains "Nutrition", you MUST include a "macros" field with:
  - calories: min and max daily calories, and goal (Gain/Lose/Maintain)
  - protein, carbs, fats: percentage (0-100) and grams per day
- Calculate based on the person's weight, age, gender, and body fat goal
- For other sections, "macros" field is optional and can be omitted
    "time_estimate": [
        {"percent": <target body fat %>, "months": <number of months>},
        {"percent": <next target %>, "months": <number of months>}
    ]
}

IMPORTANT for time_estimate:
- Provide an array of objects with "percent" (target body fat percentage) and "months" (time needed)
- Example: [{"percent": 20, "months": 2}, {"percent": 18, "months": 4}, {"percent": 15, "months": 6}]
- Show realistic progression from current to optimal body fat
- Each step should be achievable and realistic

Rules:
- title: appropriate title based on whether person needs to reduce, maintain, or increase body fat
- sections: 3-5 sections covering: nutrition, exercise, lifestyle, specific recommendations
- content: concise, practical advice in English (approximately 20% shorter than typical, but keep the most essential information), use \\n for line breaks
- Keep content focused on key actionable points - prioritize the most important recommendations
- time_estimate: realistic timeframe based on current body fat and target
- Be encouraging, realistic, and professional
- Provide specific, actionable recommendations but be concise
- Do not provide any text outside the JSON object"""

    gender_text = "male" if request.gender == "male" else "female"
    optimal_range = "15-20%" if request.gender == "male" else "20-25%"
    target_percent = 18 if request.gender == "male" else 22
    
    # Рассчитываем временные рамки по формуле
    # Всегда показываем путь до 10% (атлетический уровень)
    final_target = 10.0  # Целевой процент для всех
    time_estimates = []
    
    if request.evaluation in ["Above Average", "High"]:
        # Для высокого процента - путь до 10%
        time_estimates = _calculate_time_estimates(request.body_fat_percent, final_target, request.gender)
    elif request.evaluation == "Normal":
        # Для нормального - тоже показываем путь до 10%
        time_estimates = _calculate_time_estimates(request.body_fat_percent, final_target, request.gender)
    else:
        # Для низкого - показываем путь до 10% (если еще не достигнут)
        if request.body_fat_percent > final_target:
            time_estimates = _calculate_time_estimates(request.body_fat_percent, final_target, request.gender)
        else:
            time_estimates = [{"percent": round(request.body_fat_percent, 1), "months": 0}]
    
    user_prompt = f"""Create personalized advice for a {gender_text}, {request.age} years old.

Current situation:
- Body fat percentage: {request.body_fat_percent}%
- Evaluation: {request.evaluation}
- Optimal range for {gender_text}: {optimal_range}

Create concise but comprehensive recommendations (approximately 20% shorter than typical, focusing on the most essential points) that will help:
1. {"Reduce" if request.body_fat_percent > 10 else "Maintain"} body fat to athletic level (10%)
2. Improve overall health
3. Achieve long-term results

Include specific, focused recommendations for:
- Nutrition (key calories, macronutrients, essential foods - be concise). For Nutrition section, you MUST include "macros" field with:
  * calories: min/max daily calories and goal (Gain/Lose/Maintain)
  * protein, carbs, fats: percentage (0-100) and grams per day
  * Calculate based on person's weight, age, gender, and body fat goal
- Exercise (type, frequency, intensity - focus on most important)
- Lifestyle (sleep, stress, hydration - essential points only)

IMPORTANT: 
- Keep each section's content approximately 20% shorter than typical advice, but ensure all critical information is included
- For Nutrition section, always include the "macros" field with calculated values
- Prioritize the most actionable and important recommendations

IMPORTANT for time_estimate:
Use EXACTLY this array (calculated using scientific formula):
{json.dumps(time_estimates, ensure_ascii=False, indent=2)}

DO NOT modify these values! Copy them exactly as they are into the time_estimate field.

Respond with JSON only."""

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,  # Немного выше для более разнообразных советов
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            raise Exception("Empty response from OpenAI API")
        
        result = json.loads(content)
        
        # ВСЕГДА используем рассчитанные временные рамки (не доверяем GPT)
        time_estimate = time_estimates if time_estimates else None
        
        return AdviceResponse(
            title=result.get("title", "Personalized Recommendations"),
            sections=result.get("sections", []),
            time_estimate=time_estimate
        )
        
    except Exception as e:
        print(f"Error generating advice: {str(e)}")
        return _get_mock_advice(request)


def _get_mock_advice(request: AdviceRequest) -> AdviceResponse:
    """Mock advice for testing without OpenAI API key"""
    # Всегда рассчитываем до 10% (атлетический уровень)
    final_target = 10.0
    
    if request.evaluation in ["Above Average", "High"]:
        # Calculate macros for weight loss
        base_calories = request.body_fat_percent * 20 + 1500  # Rough estimate
        daily_calories = max(1500, base_calories - 400)  # Deficit
        protein_grams = round(request.body_fat_percent * 1.8 * 2)  # Rough estimate based on body fat
        carbs_grams = round(daily_calories * 0.4 / 4)
        fats_grams = round(daily_calories * 0.2 / 9)
        
        title = "Tips for Reducing Body Fat"
        sections = [
            {
                "title": "Nutrition",
                "content": "Create a calorie deficit of 300-500 kcal per day. Increase protein intake to 1.6-2.2g per kg of body weight. Eat more vegetables, whole grains, and lean protein.",
                "macros": {
                    "calories": {"min": int(daily_calories - 100), "max": int(daily_calories + 100), "goal": "Lose"},
                    "protein": {"percent": 30, "grams": protein_grams},
                    "carbs": {"percent": 40, "grams": carbs_grams},
                    "fats": {"percent": 20, "grams": fats_grams}
                }
            },
            {
                "title": "Exercise",
                "content": "Combine strength training 3-4 times per week with cardio 2-3 times per week. Strength training will help preserve muscle mass, while cardio will accelerate fat burning."
            },
            {
                "title": "Lifestyle",
                "content": "Sleep 7-9 hours per night. Manage stress. Drink enough water (30-35 ml per kg of body weight). Avoid alcohol and processed foods."
            }
        ]
        time_estimate = _calculate_time_estimates(request.body_fat_percent, final_target, request.gender)
    elif request.evaluation == "Normal":
        # Calculate macros for maintaining/slight deficit
        base_calories = request.body_fat_percent * 20 + 1500
        daily_calories = max(1800, base_calories - 250)
        protein_grams = round(request.body_fat_percent * 2.2 * 2)
        carbs_grams = round(daily_calories * 0.45 / 4)
        fats_grams = round(daily_calories * 0.25 / 9)
        
        title = "Recommendations for Achieving Athletic Form"
        sections = [
            {
                "title": "Nutrition",
                "content": "Create a small calorie deficit of 200-300 kcal per day. Increase protein intake to 2-2.5g per kg of body weight. Eat more vegetables, lean protein, and complex carbohydrates.",
                "macros": {
                    "calories": {"min": int(daily_calories - 100), "max": int(daily_calories + 100), "goal": "Lose"},
                    "protein": {"percent": 30, "grams": protein_grams},
                    "carbs": {"percent": 45, "grams": carbs_grams},
                    "fats": {"percent": 25, "grams": fats_grams}
                }
            },
            {
                "title": "Exercise",
                "content": "Intense workouts 4-5 times per week. Combine strength training with high-intensity cardio. Focus on burning fat while preserving muscle mass."
            },
            {
                "title": "Lifestyle",
                "content": "Sleep 7-9 hours per night. Manage stress. Drink enough water. Avoid alcohol and processed foods. Be patient - reducing to 10% takes time."
            }
        ]
        # Для нормального процента тоже показываем путь до 10%
        if request.body_fat_percent > final_target:
            time_estimate = _calculate_time_estimates(request.body_fat_percent, final_target, request.gender)
        else:
            time_estimate = [{"percent": round(request.body_fat_percent, 1), "months": 0}]
    else:
        # Для низкого процента - показываем поддержание или путь до 10%
        if request.body_fat_percent > final_target:
            title = "Recommendations for Achieving Athletic Form"
            sections = [
                {
                    "title": "Nutrition",
                    "content": "Maintain a small calorie deficit. Increase protein intake. Eat quality food rich in nutrients."
                },
                {
                    "title": "Exercise",
                    "content": "Intense workouts 4-5 times per week. Combine strength and cardio training to achieve athletic form."
                }
            ]
            time_estimate = _calculate_time_estimates(request.body_fat_percent, final_target, request.gender)
        else:
            title = "Recommendations for Maintaining Athletic Form"
            sections = [
                {
                    "title": "Nutrition",
                    "content": "Maintain calorie balance. Eat a variety of nutrient-rich foods. Control portions."
                },
                {
                    "title": "Exercise",
                    "content": "Regular workouts 3-4 times per week. Combine strength and cardio training to maintain form."
                }
            ]
            time_estimate = [{"percent": round(request.body_fat_percent, 1), "months": 0}]
    
    return AdviceResponse(
        title=title,
        sections=sections,
        time_estimate=time_estimate
    )
