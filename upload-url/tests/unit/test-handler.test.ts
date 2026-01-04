import { handler } from "../../app";

describe("Upload URL Lambda", () => {
  beforeEach(() => {
    process.env.VIDEO_BUCKET_NAME = "test-bucket";
  });

  it("should return 400 if request body is missing", async () => {
    const event: any = {};

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if file size exceeds 1GB", async () => {
    const event: any = {
      body: JSON.stringify({
        fileName: "big.mp4",
        fileType: "video/mp4",
        fileSize: 2 * 1024 * 1024 * 1024,
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toContain("1GB");
  });

  it("should generate a pre-signed URL for valid input", async () => {
    const event: any = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileSize: 500000000,
      }),
    };

    const response = await handler(event);

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.uploadUrl).toBe("https://mock-presigned-url");
    expect(body.key).toContain("videos/");
  });

  it("should return 500 if bucket name is missing", async () => {
    delete process.env.VIDEO_BUCKET_NAME;

    const event: any = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileSize: 1000,
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
  });
});
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

jest.mock("@aws-sdk/s3-request-presigner");

describe("Upload URL Lambda", () => {
  // existing tests ...

  it("should return 500 if S3 pre-signed URL generation fails", async () => {
    (getSignedUrl as jest.Mock).mockRejectedValueOnce(
      new Error("S3 failure")
    );

    process.env.VIDEO_BUCKET_NAME = "test-bucket";

    const event: any = {
      body: JSON.stringify({
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileSize: 1000,
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe(
      "Internal server error"
    );
  });
});
