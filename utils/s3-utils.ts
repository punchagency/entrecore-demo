import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Upload a file to S3
 * @param file The file to upload
 * @param customPath Optional custom path within the bucket
 * @returns The URL of the uploaded file
 */
export const uploadToS3 = async (file: File, customPath?: string): Promise<string> => {
  try {
    // Validate inputs
    if (!file) {
      throw new Error("No file provided for upload");
    }

    if (file.size === 0) {
      throw new Error("Cannot upload empty file");
    }

    if (file.size > 100 * 1024 * 1024) {
      throw new Error("File size exceeds 100MB limit");
    }

    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("S3 bucket name not configured");
    }

    if (!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || !process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
      throw new Error("AWS credentials not configured");
    }

    const fileExtension = file.name.split(".").pop();
    if (!fileExtension) {
      throw new Error("File must have an extension");
    }

    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const path = customPath || "uploads";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const params = {
      Bucket: bucketName,
      Key: `${path}/${uniqueFileName}`,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    };

    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    
    console.log("S3 upload successful:", response);
    return `https://${bucketName}.s3.amazonaws.com/${path}/${uniqueFileName}`;

  } catch (error) {
    console.error("Error uploading to S3:", error);
    
    if (error instanceof Error) {
      if (error.name === 'CredentialsError') {
        throw new Error("Invalid AWS credentials. Please check your configuration.");
      }
      if (error.name === 'NetworkingError') {
        throw new Error("Network error occurred while uploading. Please check your connection.");
      }
      if (error.name === 'AccessDenied') {
        throw new Error("Access denied. Please check your S3 bucket permissions.");
      }
      throw error;
    }
    
    throw new Error("Failed to upload file to S3");
  }
};

/**
 * Delete a file from S3
 * @param fileUrl The full URL of the file to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided for deletion");
    }

    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("S3 bucket name not configured");
    }

    const urlParts = fileUrl.split(`${bucketName}.s3.amazonaws.com/`);
    if (urlParts.length !== 2) {
      throw new Error("Invalid S3 URL format. Expected format: https://bucket.s3.amazonaws.com/key");
    }

    const key = urlParts[1];
    if (!key) {
      throw new Error("Could not extract file key from URL");
    }

    const params = {
      Bucket: bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    
    console.log("S3 deletion successful for key:", key);

  } catch (error) {
    console.error("Error deleting from S3:", error);
    
    if (error instanceof Error) {
      if (error.name === 'NoSuchKey') {
        console.warn("File not found in S3, may have been already deleted");
        return;
      }
      if (error.name === 'AccessDenied') {
        throw new Error("Access denied. Please check your S3 bucket permissions.");
      }
      throw error;
    }
    
    throw new Error("Failed to delete file from S3");
  }
};

/**
 * Get a file's public URL from its key
 * @param key The S3 key of the file
 * @returns The public URL of the file
 */
export const getS3FileUrl = (key: string): string => {
  try {
    if (!key) {
      throw new Error("No key provided");
    }

    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("S3 bucket name not configured");
    }

    return `https://${bucketName}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error generating S3 URL:", error);
    throw error;
  }
};

/**
 * Download a file from a URL
 * @param url The URL of the file to download
 * @param fileName Optional custom filename for the download
 */
export const downloadFile = async (url: string, fileName?: string) => {
  try {
    if (!url) {
      throw new Error("No URL provided for download");
    }

    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);

    const downloadName = fileName || url.split("/").pop() || "download";
    link.download = downloadName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(link.href);
    
    console.log("File downloaded successfully:", downloadName);

  } catch (error) {
    console.error("Error downloading file:", error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error("Failed to download file");
  }
};