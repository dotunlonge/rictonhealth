import { S3Client } from '@aws-sdk/client-s3';

// Suppress AWS SDK Node version warning for Node v20
process.env.AWS_SUPPRESS_NODE_VERSION_WARNING = '1';

const region = process.env.AWS_REGION || 'us-east-1';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
  throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be configured together');
}

const credentials =
  accessKeyId && secretAccessKey
    ? {
        accessKeyId,
        secretAccessKey,
      }
    : undefined;

export const s3Client = new S3Client({
  region,
  // Omit credentials on ECS/EKS/EC2 so the SDK uses the workload identity
  // provider chain. Local explicit credentials remain supported as a pair.
  ...(credentials ? { credentials } : {}),
});

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME?.trim() || '';
export const S3_REGION = region;
