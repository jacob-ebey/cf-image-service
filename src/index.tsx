import { createHandler } from "./cf-helpers";
import { type Env, type RequestContext } from "./types";
import * as image from "./routes/image.$key";
import * as landing from "./routes/landing";
import * as upload from "./routes/upload";

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
  fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const requestContext: RequestContext = { env };

    return handler(request, requestContext);
  },
};
