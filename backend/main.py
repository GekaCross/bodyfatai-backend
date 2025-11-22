from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from models import BodyFatRequest, BodyFatResponse, Gender, AdviceRequest, AdviceResponse
from services.openai_client import calculate_body_fat, calculate_body_fat_with_image, generate_advice
from config import settings
from typing import Optional
import os

app = FastAPI(title="BodyFatAI API", version="1.0.0")

# CORS middleware для работы с мобильным приложением
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Раздача статических файлов (веб-интерфейс)
# Получаем абсолютный путь к папке web
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(backend_dir)
web_dir = os.path.join(project_dir, "web")
html_path = os.path.join(web_dir, "index.html")

# Отладочная информация
print(f"Backend dir: {backend_dir}")
print(f"Project dir: {project_dir}")
print(f"Web dir: {web_dir}")
print(f"HTML path: {html_path}")
print(f"HTML exists: {os.path.exists(html_path)}")

if os.path.exists(web_dir):
    app.mount("/static", StaticFiles(directory=web_dir), name="static")

@app.get("/")
async def root():
    # Возвращаем HTML файл веб-интерфейса
    # Вычисляем путь динамически на случай, если сервер запущен из другой директории
    current_backend_dir = os.path.dirname(os.path.abspath(__file__))
    current_project_dir = os.path.dirname(current_backend_dir)
    current_web_dir = os.path.join(current_project_dir, "web")
    current_html_path = os.path.join(current_web_dir, "index.html")
    
    if os.path.exists(current_html_path):
        return FileResponse(current_html_path, media_type="text/html")
    return {"message": "BodyFatAI API is running", "docs": "/docs", "html_path": current_html_path, "exists": os.path.exists(current_html_path)}


@app.post("/api/bodyfat", response_model=BodyFatResponse)
async def calculate_body_fat_percent(
    request: Request,
    gender: Gender = Form(...),
    age: int = Form(...),
    height: float = Form(...),
    weight: float = Form(...),
    waist: Optional[str] = Form(None)
):
    """
    Calculate body fat percentage based on user input and optionally images.
    If images are provided, the first image will be analyzed using GPT-4 Vision to improve accuracy.
    """
    try:
        # Получаем файлы из формы
        form = await request.form()
        images = form.getlist("images")  # Получаем все файлы с ключом "images"
        
        # Обрабатываем waist - может быть пустой строкой
        waist_float = None
        if waist and waist.strip():
            try:
                waist_float = float(waist)
            except ValueError:
                waist_float = None
        
        # Создаем объект запроса
        body_fat_request = BodyFatRequest(
            gender=gender,
            age=age,
            height=height,
            weight=weight,
            waist=waist_float
        )
        
        # Если есть изображения, используем анализ с фото
        if images and len(images) > 0:
            # Собираем все изображения для анализа
            image_data_list = []
            content_type_list = []
            for image in images:
                print(f"Processing image: {image.filename if hasattr(image, 'filename') else 'unknown'}, content_type: {image.content_type if hasattr(image, 'content_type') else 'unknown'}")
                image_data_list.append(await image.read())
                content_type_list.append(image.content_type if hasattr(image, 'content_type') else "image/jpeg")
            
            print(f"Processing {len(image_data_list)} image(s) for analysis")
            result = await calculate_body_fat_with_image(body_fat_request, image_data_list, content_type_list)
        else:
            print("No images provided, using regular calculation")
            result = await calculate_body_fat(body_fat_request)
        
        return result
    except Exception as e:
        import traceback
        error_detail = f"Error calculating body fat: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@app.post("/api/advice", response_model=AdviceResponse)
async def get_advice(request: AdviceRequest):
    """
    Get personalized advice for body fat management based on current body fat percentage.
    """
    try:
        result = await generate_advice(request)
        return result
    except Exception as e:
        import traceback
        error_detail = f"Error generating advice: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


