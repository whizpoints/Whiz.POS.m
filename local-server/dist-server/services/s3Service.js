import dotenv from 'dotenv';
dotenv.config();
let s3Client = null;
let PutObjectCommandCls = null;
const getS3Client = async () => {
    if (!s3Client) {
        const aws = await import("@aws-sdk/client-s3");
        PutObjectCommandCls = aws.PutObjectCommand;
        s3Client = new aws.S3Client({
            region: process.env.S3_REGION || "auto",
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
        });
    }
    return { s3Client, PutObjectCommand: PutObjectCommandCls };
};
export const uploadAsset = async (fileBuffer, fileName, mimeType) => {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName)
        throw new Error("S3_BUCKET_NAME is not set");
    const { s3Client, PutObjectCommand } = await getS3Client();
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: "public-read"
    });
    await s3Client.send(command);
    const publicUrl = process.env.S3_PUBLIC_URL;
    if (!publicUrl)
        throw new Error("S3_PUBLIC_URL is not set");
    return `${publicUrl.replace(/\/$/, '')}/${fileName}`;
};
