import {
  json,
  typedURL,
  type DataFunctionArgs,
  type TypedRequest,
} from "remix-router-cf-worker";
import ImageJS, { Image } from "image-js";

import { type RequestContext } from "../types";

export type ImageGET = TypedRequest<"GET", `image/*`, "w" | "h" | "aspect">;

export async function loader({
  context: { env },
  params: { "*": key },
  request,
}: DataFunctionArgs<ImageGET, RequestContext> & { params: { "*": string } }) {
  if (key) {
    const obj = await env.FILES_BUCKET.get(key);

    if (obj && obj.key) {
      const url = typedURL(request);
      const widthParam = url.searchParams.get("w");
      const heightParam = url.searchParams.get("h");
      const aspectParam = url.searchParams.get("aspect");

      const preserveAspectRatio =
        aspectParam === "p" || aspectParam === "preserve";
      const width = widthParam ? parseInt(widthParam) : undefined;
      const height =
        heightParam && (!preserveAspectRatio || !width)
          ? parseInt(heightParam)
          : undefined;

      if (width < 0 || height < 0) {
        return json(
          {
            message: "Invalid width or height",
          },
          400
        );
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

  const pngImage = new Image(1, 1, [0, 0, 0, 0], {
    alpha: 1,
  }).toBuffer({
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
