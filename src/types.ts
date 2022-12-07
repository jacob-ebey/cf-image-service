export interface Env {
  FILES_BUCKET: R2Bucket;
}

export interface RequestContext {
  env: Env;
}
