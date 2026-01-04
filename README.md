📦 Uploading Large Files to S3 (Serverless)
📌 Overview

This project demonstrates a scalable backend architecture for uploading large video files (up to 1GB) using AWS Serverless services.

Instead of uploading files through the backend (which has size limits), the system uses S3 pre-signed URLs so clients can upload files directly to Amazon S3.

This approach is secure, cost-effective, and production-ready.

🏗️ Architecture

Client (Web / Mobile)
        |
        | 1. Request upload URL
        v
API Gateway (REST)
        |
        v
AWS Lambda (TypeScript)
        |
        | 2. Generate pre-signed URL
        v
Amazon S3
        ^
        |
        | 3. Direct file upload (PUT)
        |
Client

🧰 Tech Stack

Language: TypeScript

Backend: AWS Lambda

API: Amazon API Gateway (REST)

Storage: Amazon S3

IaC: AWS SAM

Testing: Jest (with AWS SDK mocks)

📁 Project Structure

Uploading-large-file-to-S3/
│
├── template.yaml              # SAM template (API, Lambda, S3)
├── README.md
├── samconfig.toml
│
└── upload-url/
    ├── app.ts                 # Lambda handler
    ├── app.test.ts            # Jest tests
    ├── tests/unit/            # Unit tests
    ├── __mocks__/              # AWS SDK mocks
    ├── package.json
    ├── tsconfig.json
    └── jest.config.ts

🔁 API Flow
1️⃣ Request a Pre-Signed Upload URL

Endpoint

POST /videos/upload-url


Request Body

{
  "fileName": "video.mp4",
  "fileType": "video/mp4",
  "fileSize": 500000000
}

2️⃣ API Response
{
  "message": "Pre-signed URL generated successfully",
  "uploadUrl": "https://s3.amazonaws.com/....",
  "key": "videos/1700000000-video.mp4"
}

3️⃣ Upload File Directly to S3
curl -X PUT "<UPLOAD_URL>" \
  -H "Content-Type: video/mp4" \
  --upload-file "/path/to/video.mp4"


✅ File appears in S3 bucket after upload.

🔐 Security Measures

Pre-signed URL expiry: 15 minutes

File size validation (max 1GB)

Private S3 bucket (no public access)

IAM permissions scoped to a single bucket

🧪 Testing

Unit tests written using Jest

AWS SDK calls mocked

100% code coverage

Run tests
cd upload-url
npm test

🚀 Local Development
sam build
sam local start-api

📦 Large File Upload to S3 (this project)

Both projects demonstrate real-world serverless backend design using AWS.

👤 Author

G. Naveen Kumar
B.Tech – Computer Science & Engineering
Serverless | AWS | TypeScript | Backend Development
