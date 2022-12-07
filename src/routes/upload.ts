import ImageJS, { Image } from "image-js";

import { json, type DataFunctionArgs, type TypedRequest } from "../cf-helpers";
import { type RequestContext } from "../types";

export type POST = TypedRequest<
  "POST",
  "/upload",
  {},
  {
    images: [File, "The images to upload."];
  }
>;

export async function action({
  context: { env },
  request,
}: DataFunctionArgs<POST, RequestContext>) {
  const results: {
    key: string;
  }[] = [];

  const contentType = request.headers.get("Content-Type");
  if (contentType && contentType.match(/multipart\/form-data/)) {
    const formData = await request.formData();
    const images = formData.getAll("images");
    for (const file of images) {
      if (!file || typeof file === "string") {
        return json({ message: "Invalid file" }, 400);
      }

      try {
        const imageBuffer = await file.arrayBuffer();
        const image = await ImageJS.load(imageBuffer);
        const pngImage = image.toBuffer({ format: "png" });

        const sha256 = await crypto.subtle.digest("SHA-256", pngImage);
        const hash = buf2hex(sha256);

        const key = `${hash}.png`;

        const existing = await env.FILES_BUCKET.head(key);
        if (existing && existing.key) {
          results.push({ key: existing.key });
        } else {
          await env.FILES_BUCKET.put(key, pngImage, {
            sha256,
          });

          results.push({ key });
        }
      } catch (reason) {
        console.error(reason);
        return json({ message: "Invalid file" }, 400);
      }
    }
  } else {
    try {
      const imageBuffer = await request.arrayBuffer();
      const image = await ImageJS.load(imageBuffer);

      const pngImage = image.toBuffer({ format: "png" });

      const sha256 = await crypto.subtle.digest("SHA-256", pngImage);
      const hash = buf2hex(sha256);

      const key = `${hash}.png`;

      const existing = await env.FILES_BUCKET.head(key);
      if (existing && existing.key) {
        results.push({ key: existing.key });
      } else {
        await env.FILES_BUCKET.put(key, pngImage, {
          sha256,
        });
        results.push({ key });
      }
    } catch (reason) {
      console.error(reason);
      return json({ message: "Invalid file" }, 400);
    }
  }

  return json({ images: results });
}

function buf2hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
