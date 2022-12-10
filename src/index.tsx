import { createHandler, type TypedRequest } from "remix-router-cf-worker";

import { type Env, type RequestContext } from "./types";
import * as image from "./routes/image.$key";
import * as landing from "./routes/landing";
import * as upload from "./routes/upload";

export { type ImageGET } from "./routes/image.$key";
export { type UploadPOST } from "./routes/upload";

export type Handler = typeof handler;
const handler = createHandler([
  {
    id: "landing",
    path: "/",
    loader: landing.loader,
    action: landing.action,
  },
  {
    id: "upload",
    path: "upload",
    action: upload.action,
  },
  {
    id: "image",
    path: "image/*",
    loader: image.loader,
  },
]);

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const requestContext: RequestContext = { env };

    return handler(request as TypedRequest<any, any>, requestContext as never);
  },
};
