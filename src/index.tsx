import { renderToString } from "preact-render-to-string";
import ImageJS, { Image } from "image-js";

import { json, typeRequest, type TypedRequest } from "./cf-helpers";
import { Landing } from "./ui/landing";

interface Env {
  FILES_BUCKET: R2Bucket;
}

type LandingPageRequest = TypedRequest<"GET", "/">;
type ImageRequest = TypedRequest<
  "GET",
  `/${string}`,
  {
    w: "The width of the new image.";
    h: "The height of the new image";
    aspect: "Use `p` or `preserve` to maintain the aspect ratio.";
  }
>;
type UploadRequest = TypedRequest<"POST", "/upload">;

export type TypedRequests = LandingPageRequest | ImageRequest | UploadRequest;

export interface ErrorResponse {
  message: string;
}

export interface CreateResponse {
  images: ImageResult[];
}

export interface ImageResult {
  key: string;
}

export default {
  async fetch(
    _request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    let request = typeRequest<TypedRequests>(_request);

    switch (request.method) {
      case "GET": {
        if (request.typedURL.pathname === "/") {
          request = request as LandingPageRequest;
          return new Response(renderToString(<Landing />), {
            headers: {
              "Content-Type": "text/html",
            },
          });
        } else {
          request = request as ImageRequest;

          const key = request.typedURL.pathname.slice(1);
          if (key) {
            const obj = await env.FILES_BUCKET.get(key);

            if (obj && obj.key) {
              const widthParam = request.typedURL.searchParams.get("w");
              const heightParam = request.typedURL.searchParams.get("h");
              const aspectParam = request.typedURL.searchParams.get("aspect");

              const preserveAspectRatio =
                aspectParam === "p" || aspectParam === "preserve";
              const width = widthParam ? parseInt(widthParam) : undefined;
              const height =
                heightParam && (!preserveAspectRatio || !width)
                  ? parseInt(heightParam)
                  : undefined;

              if (width < 0 || height < 0) {
                return json<ErrorResponse>({
                  message: "Invalid width or height",
                });
              }

              if (width > 0 || height > 0) {
                let image = await ImageJS.load(await obj.arrayBuffer());
                image = image.resize({
                  height,
                  width,
                  preserveAspectRatio,
                });

                const pngImage = image.toBuffer({ format: "png" });
                return new Response(pngImage, {
                  headers: {
                    "Content-Type": "image/png",
                    "Content-Length": pngImage.byteLength.toFixed(0),
                    "Cache-Control": "s-maxage=31536000",
                  },
                });
              }

              return new Response(obj.body, {
                headers: {
                  "Content-Type": "image/png",
                  "Content-Length": obj.size.toFixed(0),
                  "Cache-Control": "s-maxage=31536000",
                },
              });
            }
          }
        }

        const pngImage = new Image(1, 1, [0, 0, 0, 0], { alpha: 1 }).toBuffer({
          format: "png",
        });
        return new Response(pngImage, {
          status: 404,
          headers: {
            "Content-Type": "image/png",
            "Content-Length": pngImage.byteLength.toFixed(0),
          },
        });
      }

      case "POST": {
        if (request.typedURL.pathname === "/upload") {
          const results: ImageResult[] = [];

          const contentType = request.headers.get("Content-Type");
          if (contentType && contentType.match(/multipart\/form-data/)) {
            const formData = await request.formData();
            const images = formData.getAll("images");
            for (const file of images) {
              if (!file || typeof file === "string") {
                return json<ErrorResponse>({ message: "Invalid file" }, 400);
              }

              try {
                const imageBuffer = await file.arrayBuffer();
                const image = await ImageJS.load(imageBuffer);
                const pngImage = image.toBuffer({ format: "png" });

                const sha256 = await crypto.subtle.digest("SHA-256", pngImage);
                const hash = buf2hex(sha256);

                const key = `images/${hash}.png`;

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
                return json<ErrorResponse>({ message: "Invalid file" }, 400);
              }
            }
          } else {
            try {
              const imageBuffer = await request.arrayBuffer();
              const image = await ImageJS.load(imageBuffer);

              const pngImage = image.toBuffer({ format: "png" });

              const sha256 = await crypto.subtle.digest("SHA-256", pngImage);
              const hash = buf2hex(sha256);

              const key = `images/${hash}.png`;

              const existing = await env.FILES_BUCKET.head(key);
              if (existing && existing.key) {
                results.push({ key: existing.key });
              } else {
                const uploaded = await env.FILES_BUCKET.put(key, pngImage, {
                  sha256,
                });
                results.push({ key });
              }
            } catch (reason) {
              console.error(reason);
              return json<ErrorResponse>({ message: "Invalid file" }, 400);
            }
          }

          return json<CreateResponse>({ images: results });
        }
        return new Response(null, { status: 404 });
      }

      default:
        return new Response(null, { status: 405 });
    }
  },
};

export function buf2hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
