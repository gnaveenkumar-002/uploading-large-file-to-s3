Uploading Large Files to S3 (Serverless)

Overview

This project demonstrates a scalable, production-ready backend architecture for uploading large video files (up to 1GB and beyond) using AWS Serverless services.

Instead of uploading files through the backend (which is limited by API Gateway and Lambda constraints), the system uses Amazon S3 Multipart Upload with pre-signed URLs.
The backend only coordinates the upload, while the client uploads file chunks directly to S3.

This approach is secure, cost-effective, and production-ready.

 Architecture

Client (Web / Mobile / Node.js)
   |
   | 1. Initiate multipart upload
   v
API Gateway (REST)
   |
   v
AWS Lambda (TypeScript)
   |
   | 2. Create multipart upload (S3)
   v
Amazon S3
   ^
   |
   | 3. Upload file chunks directly using presigned URLs
   |
Client
   |
   | 4. Complete multipart upload
   v
AWS Lambda → Amazon S3 (merge parts)


  Tech Stack

Language: TypeScript

Compute: AWS Lambda

API: Amazon API Gateway (REST)

Storage: Amazon S3 (Multipart Upload)

Infrastructure: AWS SAM

Testing: Jest (AWS SDK mocked)

Project Structure

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

Multipart Upload API Flow
 Initiate Multipart Upload

Endpoint

POST http:/{aws}/{satge}/videos/multipart/initiate


Request Body

{
  "fileName": "video.mp4",
  "fileType": "video/mp4"
}


Response

{
  "uploadId": "abc123",
  "key": "videos/1700000000-video.mp4"
}


Creates a multipart upload session in S3.
Get Pre-Signed URL for a Part

Endpoint

GET /videos/multipart/{uploadId}/{partNumber}/url?key=...


Response

{
  "url": "https://s3.amazonaws.com/..."
}


One URL per part

Generated on demand

Expires in 15 minutes

 Upload File Chunks Directly to S3

The client:

Splits the file into 5 MB chunks

Uploads each chunk using PUT to S3

Example:

curl -X PUT "<PRESIGNED_URL>" \
  -H "Content-Type: application/octet-stream" \
  --upload-file chunk.bin


 No Lambda or API Gateway involved during file transfer.

 Complete Multipart Upload

Endpoint

POST /videos/multipart/{uploadId}/complete


Request Body

{
  "uploadId": "abc123",
  "key": "videos/1700000000-video.mp4",
  "parts": [
    { "PartNumber": 1, "ETag": "\"etag1\"" },
    { "PartNumber": 2, "ETag": "\"etag2\"" }
  ]
}


S3 merges all uploaded parts into one final video file.

Result

Single video file stored in S3

Correct file size

Fully playable

Supports uploads well beyond 1GB

Security Measures

Pre-signed URL expiry: 15 minutes

File never passes through Lambda

Private S3 bucket (no public access)

IAM permissions scoped to a single bucket

Controlled uploads via multipart sessions

Testing

Unit tests written using Jest

AWS SDK calls mocked

Success and failure cases covered

100% code coverage

Run tests:

cd upload-url
npm test

Local Development
sam build
sam local start-api

Real-World Validation

Successfully tested with a ~385 MB video file

Upload performed using a TypeScript client

Multipart upload verified in Amazon S3

Upload duration exceeded 15 minutes safely, without Lambda timeout issues

Key Design Principle

Lambda orchestrates the multipart upload,
while the client uploads file chunks directly to S3 using pre-signed URLs.

This avoids:

API Gateway size limits

Lambda timeout constraints

High backend compute costs


Author

G. Naveen Kumar
Serverless | AWS | TypeScript | Backend Development

