import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFile(
  fileBuffer: Buffer,
  folder: string,
  fileName: string,
  mimeType?: string
): Promise<string> {
  // PDF aur non-image files ke liye raw resource type use karo
  const isPdf = mimeType === "application/pdf";
  const resourceType = isPdf ? "raw" : "image";

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `medflow/${folder}`,
          public_id: isPdf ? `${fileName}.pdf` : fileName,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      )
      .end(fileBuffer);
  });
}

export async function deleteFile(
  publicId: string,
  resourceType: "image" | "raw" = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export { cloudinary };