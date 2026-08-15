import { v2 as cloudinary } from "cloudinary";

export const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return cloudinary;
};

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  options: { folder: string; public_id: string }
): Promise<{ secure_url: string }> => {
  const client = getCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.public_id,
        overwrite: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};
