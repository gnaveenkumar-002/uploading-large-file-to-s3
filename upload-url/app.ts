import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const s3 = new S3Client({});
const bucketName = process.env.VIDEO_BUCKET_NAME as string;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers, body: "" };
    }

    // With Path: /videos/multipart/{proxy+}, API Gateway puts the rest in pathParameters.proxy
    const proxy = event.pathParameters?.proxy || ""; 
    const parts = proxy.split("/").filter(Boolean);

    // 1) POST /videos/multipart/initiate
    if (event.httpMethod === "POST" && parts[0] === "initiate") {
      const { fileName, fileType } = JSON.parse(event.body || "{}");
      if (!fileName || !fileType) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "fileName and fileType required" }),
        };
      }

      const key = `videos/${Date.now()}-${fileName}`;
      const res = await s3.send(
        new CreateMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: fileType,
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ uploadId: res.UploadId, key }),
      };
    }

    // 2) GET /videos/multipart/{uploadId}/{partNumber}/url?key=...
    if (event.httpMethod === "GET" && parts.length === 3 && parts[2] === "url") {
      const uploadId = parts[0];
      const partNumber = Number(parts[1]);
      const key = event.queryStringParameters?.key;

      if (!uploadId || !key || !partNumber || Number.isNaN(partNumber)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Missing uploadId/partNumber/key" }),
        };
      }

      const url = await getSignedUrl(
        s3,
        new UploadPartCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 900 }
      );

      return { statusCode: 200, headers, body: JSON.stringify({ url }) };
    }

    // 3) POST /videos/multipart/{uploadId}/complete
    if (event.httpMethod === "POST" && parts.length === 2 && parts[1] === "complete") {
      const { uploadId, key, parts: completedParts } = JSON.parse(event.body || "{}");
      if (!uploadId || !key || !Array.isArray(completedParts) || completedParts.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "uploadId, key, parts[] required" }),
        };
      }

      await s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: completedParts },
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Upload completed", key }),
      };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ message: "Endpoint not found" }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Internal server error" }) };
  }
};
