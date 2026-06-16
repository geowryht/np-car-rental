import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function destroyImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

export function extractPublicId(url) {
  const parts = url.split("/");
  const file = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  const name = file.replace(/\.[^.]+$/, "");
  if (folder && !folder.includes(".")) return `${folder}/${name}`;
  return name;
}
