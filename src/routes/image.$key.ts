import ImageJS, { Image } from "image-js";

import { json, type DataFunctionArgs, type TypedRequest } from "../cf-helpers";
import { type RequestContext } from "../types";

export type GET = TypedRequest<
  "GET",
  `/${string}`,
  {
    w: "The with to scale the image to.";
    h: "The height to scale the image to. This is ignored if aspect is set to preserve and width is set.";
    aspect: "Whether to preserve the aspect ratio of the image. Set to `p` or `preserve` to preserve the aspect ratio.";
  },
  {}
>;

export async function loader({
  context: { env },
  params: { "*": key },
  request,
}: DataFunctionArgs<GET, RequestContext>) {
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
        return json({
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
