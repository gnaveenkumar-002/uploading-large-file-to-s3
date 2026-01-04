import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// Create S3 client (region picked automatically in Lambda)
const s3 = new S3Client({});

// Max file size = 1 GB
const MAX_FILE_SIZE = 1024 * 1024 * 1024;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};

    const { fileName, fileType, fileSize } = body;

    // -------- Validation --------
    if (!fileName || !fileType || !fileSize) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "fileName, fileType and fileSize are required",
        }),
      };
    }

    if (fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "File size exceeds 1GB limit",
        }),
      };
    }

    const bucketName = process.env.VIDEO_BUCKET_NAME;
    if (!bucketName) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "S3 bucket not configured",
        }),
      };
    }

    // -------- S3 Object Key --------
    const objectKey = `videos/${Date.now()}-${fileName}`;

    // -------- Create Pre-Signed URL --------
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 15 * 60, // 15 minutes
    });

    // -------- Success Response --------
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Pre-signed URL generated successfully",
        uploadUrl,
        key: objectKey,
      }),
    };
  } catch (error) {
    console.error("Error generating upload URL:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};
