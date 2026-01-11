import { handler } from "../../app";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent } from "aws-lambda";

// Mock ONLY the presigner (no S3Client needed for current handler)
jest.mock("@aws-sdk/s3-request-presigner");

let originalEnv: NodeJS.ProcessEnv;

describe("Upload URL Lambda", () => {
  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.VIDEO_BUCKET_NAME = "test-bucket";
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("should return 400 if request body is missing", async () => {
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(400);
    expect(body.message).toContain("required");
  });

  it("should return 400 if fileName is missing", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        fileType: "video/mp4",
        fileSize: 1000,
      }),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(400);
    expect(body.message).toContain("required");
  });

  it("should return 400 if fileType is missing", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileSize: 1000,
      }),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(400);
    expect(body.message).toContain("required");
  });

  it("should return 400 if fileSize is missing", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileType: "video/mp4",
      }),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(400);
    expect(body.message).toContain("required");
  });

  it("should return 400 if file size exceeds 1GB", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        fileName: "big.mp4",
        fileType: "video/mp4",
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      }),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(400);
    expect(body.message).toContain("1GB");
  });

  it("should return 500 if bucket name is missing", async () => {
    delete process.env.VIDEO_BUCKET_NAME;

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileSize: 1000,
      }),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(500);
    expect(body.message).toContain("configured");
  });

  it("should generate a pre-signed URL for valid input", async () => {
    const mockUrl = "https://test-bucket.s3.us-east-1.amazonaws.com/videos/123-test.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256...";
    (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileSize: 500 * 1024 * 1024, // 500MB
      }),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(200);
    expect(body.message).toContain("successfully");
    expect(body.uploadUrl).toBe(mockUrl);
    expect(body.key).toContain("videos/");
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(Object), // s3 client
      expect.any(Object), // PutObjectCommand
      { expiresIn: 15 * 60 }
    );
  });

  it("should return 500 if S3 pre-signed URL generation fails", async () => {
    (getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error("S3 presign failure"));

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileSize: 1000,
      }),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: "/",
      requestContext: {} as any,
    };

    const response = await handler(event);
    const body = JSON.parse(response.body as string);

    expect(response.statusCode).toBe(500);
    expect(body.message).toBe("Internal server error");
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
  });
});
