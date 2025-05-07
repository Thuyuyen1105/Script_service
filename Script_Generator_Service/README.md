# Data Management System

Hệ thống quản lý và crawl dữ liệu từ nhiều nguồn khác nhau.

## Yêu cầu hệ thống

- Python 3.11.6
- MongoDB 6.0+
- Redis 7.0+
- RabbitMQ 3.12+

## API Documentation

### Base URL
```
data-management-service-production.up.railway.app/api/v1
```

### Local Development
```
http://localhost:8000/api/v1
```

### 1. Crawl Data
```http
POST /data/crawl
```

Request body:
```json
{
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user123",
    "topic": "chủ đề cần tìm hiểu",
    "sources": ["wikipedia"],
    "audience": "general",
    "style": "formal",
    "language": "vi",
    "length": "medium"
}
```

Response:
```json
{
    "message": "Đang tiến hành crawl dữ liệu...",
    "taskId": "task_id",
    "extractedTopics": ["chủ đề 1", "chủ đề 2"]
}
```

### 2. Check Task Status
```http
GET /data/status/{task_id}
```

Response:
```json
{
    "taskId": "task_id",
    "status": "completed",
    "resultIds": ["result_id_1", "result_id_2"]
}
```

### 3. Get Crawl Result
```http
GET /data/result/{result_id}
```

Response:
```json
{
    "resultId": "result_id",
    "topic": "chủ đề",
    "source": "nguồn",
    "language": "vi",
    "text": "nội dung"
}
```

### 4. Get Popular Topics
```http
GET /data/popular-topics?limit=5
```

Response:
```json
["chủ đề 1", "chủ đề 2", "chủ đề 3", "chủ đề 4", "chủ đề 5"]
```

### 5. Health Check
```http
GET /health
```

Response:
```json
{
    "status": "healthy",
    "services": {
        "mongodb": "connected",
        "redis": "connected",
        "rabbitmq": "connected"
    }
}
```

## Message Queues

### 1. Crawl Data Queue
Queue này nhận các task crawl dữ liệu từ các nguồn khác nhau.

Payload format:
```json
{
    "task_id": "task_id",
    "data": {
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "user123",
        "topics": ["chủ đề 1", "chủ đề 2"],
        "sources": ["wikipedia"],
        "audience": "general",
        "style": "formal",
        "language": "vi",
        "length": "medium"
    }
}
```

### 2. Script Generate Queue
Queue này nhận dữ liệu đã crawl để tạo nội dung mới.

Payload format:
```json
{
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "6616e1b2ac9fb8d3bfc8a4c1",
    "crawl_data": [
        {
            "title": "chủ đề 1",
            "content": "nội dung crawl được từ chủ đề 1"
        },
        {
            "title": "chủ đề 2",
            "content": "nội dung crawl được từ chủ đề 2"
        }
    ],
    "audience": "kid",
    "style": "casual",
    "language": "vi",
    "length": "medium"
}
```

## Các Service Chính

### 1. Crawler Service
Service chịu trách nhiệm crawl dữ liệu từ các nguồn khác nhau.

#### Các tính năng:
- Crawl dữ liệu từ Wikipedia
- Crawl dữ liệu từ Nature
- Crawl dữ liệu từ PubMed
- Hỗ trợ đa ngôn ngữ
- Caching dữ liệu với Redis
- Lưu trữ dữ liệu vào MongoDB

#### Cách sử dụng:
```python
crawler = Crawler(redis_service, mongodb_service)
results = await crawler.crawl(
    task_id="task_id",
    topic="topic_name",
    sources=["wikipedia", "nature", "pubmed"],
    language="en"
)
```

### 2. MongoDB Service
Service quản lý dữ liệu với MongoDB.

#### Các tính năng:
- Kết nối và quản lý MongoDB
- Lưu trữ tasks và results
- Lấy danh sách chủ đề phổ biến
- Cập nhật trạng thái task
- Quản lý kết quả crawl

#### Các phương thức chính:
- `get_popular_topics(limit=5)`: Lấy danh sách chủ đề phổ biến
- `get_task(task_id)`: Lấy thông tin task
- `update_task_status(task_id, status, error)`: Cập nhật trạng thái task
- `insert_result(task_id, topic, source, language, text)`: Thêm kết quả crawl
- `update_result(result_id, text)`: Cập nhật kết quả
- `get_result(result_id)`: Lấy thông tin kết quả

### 3. Redis Service
Service quản lý cache với Redis.

#### Các tính năng:
- Cache dữ liệu crawl
- TTL (Time To Live) cho cache
- Quản lý kết nối Redis

### 4. RabbitMQ Service
Service quản lý message queue với RabbitMQ.

#### Các tính năng:
- Publish/Subscribe messages
- Quản lý tasks
- Xử lý bất đồng bộ

## Cấu trúc dữ liệu

### Task
```json
{
    "_id": "ObjectId",
    "job_id": "string",
    "userId": "string",
    "input_user": "string",
    "topics": ["string"],
    "sources": ["string"],
    "audience": "string",
    "style": "string",
    "language": "string",
    "length": "string",
    "status": "string",
    "result_ids": ["string"],
    "created_at": "datetime",
    "updated_at": "datetime",
    "error": "string"
}
```

### Result
```json
{
    "_id": "ObjectId",
    "task_id": "ObjectId",
    "topic": "string",
    "source": "string",
    "language": "string",
    "text": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

## Cài đặt và Chạy

1. Tạo và kích hoạt môi trường ảo:
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
```

2. Cài đặt các dependencies:
```bash
pip install -r requirements.txt
```

3. Cấu hình biến môi trường:
```bash
cp .env.example .env
# Chỉnh sửa các biến môi trường trong file .env
```

4. Chạy ứng dụng:
```bash
uvicorn main:app --reload
```

5. Chạy consumer để xử lý các task:
```bash
python consume_messages.py
```

## Deploy trên Railway

1. Tạo file `runtime.txt` với nội dung:
```
python-3.11.6
```

2. Cấu hình các biến môi trường trên Railway dashboard:
- MONGODB_URI
- REDIS_URL
- RABBITMQ_URL
- GEMINI_API_KEY

3. Deploy code lên Railway

## Xử lý lỗi

- Tất cả các service đều có logging để theo dõi lỗi
- Các lỗi được xử lý và lưu trữ trong task
- Có cơ chế retry cho các thao tác thất bại

## Best Practices

1. Luôn sử dụng async/await cho các thao tác I/O
2. Sử dụng connection pooling cho database
3. Implement retry mechanism cho các thao tác quan trọng
4. Log đầy đủ thông tin lỗi
5. Sử dụng transaction khi cần atomic operations
6. Validate input data trước khi xử lý
7. Sử dụng environment variables cho cấu hình
8. Implement health check endpoints
9. Sử dụng connection timeout
10. Implement circuit breaker pattern