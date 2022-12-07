import { renderToString } from "preact-render-to-string";

import { type DataFunctionArgs, type TypedRequest } from "../cf-helpers";
import { type RequestContext } from "../types";
import { Landing } from "../ui/landing";

import * as upload from "./upload";

type GET = TypedRequest<"GET", "/", {}, {}>;
type POST = TypedRequest<
  "POST",
  "/",
  upload.UploadPOST[" searchParams "],
  upload.UploadPOST[" formDataFields "]
>;

export function loader({}: DataFunctionArgs<GET, RequestContext>) {
  return new Response(renderToString(<Landing />), {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

export async function action(args: DataFunctionArgs<POST, RequestContext>) {
  const formDataPromise = args.request.clone().formData();
  const uploadResponse = await upload.action(
    args as unknown as DataFunctionArgs<upload.UploadPOST, RequestContext>
  );
  const [uploadResult, formData] = await Promise.all([
    uploadResponse.json(),
    formDataPromise,
  ]);

  let width = formData.get("width");
  width = typeof width === "string" ? width : undefined;

  return new Response(
    renderToString(<Landing uploadResult={uploadResult} width={width} />),
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
