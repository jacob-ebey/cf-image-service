/// <reference types="@cloudflare/workers-types" />

import {
  isRouteErrorResponse,
  unstable_createStaticHandler,
  type AgnosticDataNonIndexRouteObject,
  type ActionFunction,
  type LoaderFunction,
  type LoaderFunctionArgs,
} from "@remix-run/router";
import { type Exact, type Jsonify } from "type-fest";

type RequestMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH";

type URLPathname = `/${string}`;

type Description = string;

export interface TypedURLSearchParams<
  SearchParams extends { [key: string]: Description }
> extends Omit<URLSearchParams, "get" | "getAll"> {
  get(name: keyof SearchParams): string | null;
  getAll(name: keyof SearchParams): Array<string | null>;
}

export interface TypedURL<
  Pathname extends URLPathname,
  SearchParams extends { [key: string]: Description }
> extends Omit<URL, "pathname" | "searchParams"> {
  pathname: Pathname;
  searchParams: TypedURLSearchParams<SearchParams>;
}

export interface TypedFormData<
  FormDataFields extends { [key: string]: [FormDataEntryValue, Description] }
> extends Omit<FormData, "get" | "getAll" | "set" | "append" | "has"> {
  get(name: keyof FormDataFields): FormDataEntryValue;
  getAll(name: keyof FormDataFields): Array<FormDataEntryValue>;
  set<Name extends keyof FormDataFields>(
    name: Name,
    value: FormDataFields[Name][0]
  ): void;
  append<Name extends keyof FormDataFields>(
    name: Name,
    value: FormDataFields[Name][0]
  ): void;
  has(name: keyof FormDataFields): boolean;
}

export interface TypedRequest<
  Method extends RequestMethod,
  Pathname extends URLPathname,
  SearchParams extends { [key: string]: Description },
  FormDataFields extends {
    [key: string]: [FormDataEntryValue, Description];
  }
> extends Omit<Request, "method" | "formData"> {
  " method ": Method;
  " pathname ": Pathname;
  " searchParams ": SearchParams;
  " formDataFields ": FormDataFields;
  method: Method;
  typedURL: TypedURL<Pathname, SearchParams>;
  formData(): Promise<TypedFormData<FormDataFields>>;
}

export interface DataFunctionArgs<
  TRequest extends TypedRequest<any, any, any, any>,
  TContext
> extends Omit<LoaderFunctionArgs, "context" | "request"> {
  context: TContext;
  request: TRequest;
}

type UserDataFunction<
  TRequest extends TypedRequest<any, any, any, any>,
  TContext,
  TResponse extends Response
> = (args: DataFunctionArgs<TRequest, TContext>) => TResponse;

function dataFunction<
  TRequest extends TypedRequest<any, any, any, any>,
  TResponse extends Response,
  TContext = unknown
>(
  func: UserDataFunction<TRequest, TContext, TResponse>
): ActionFunction | LoaderFunction {
  return (args) => {
    const request = typeRequest<TRequest>(args.request);
    return func({
      ...args,
      context: {} as TContext,
      request,
    });
  };
}

function typeRequest<TRequest extends TypedRequest<any, any, any, any>>(
  request: Request
): TRequest {
  const result = request as TRequest;
  result.typedURL = new URL(request.url) as TypedURL<any, any>;

  return result;
}

export interface JsonResponse<Status extends number, Data = unknown>
  extends Omit<Response, "json" | "status"> {
  " json ": Data;
  json(): Promise<Jsonify<Data>>;
  status: Status;
}

export interface UnknownResponse extends Omit<Response, "status"> {
  status: unknown;
}

export function json<T, Status extends number>(
  value: T,
  status: Status | 200 = 200
): JsonResponse<Status, T> {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  }) as JsonResponse<Status, T>;
}

type RouteConfig<
  TRequest extends TypedRequest<any, any, {}, {}>,
  TContext
> = Omit<AgnosticDataNonIndexRouteObject, "children" | "loader" | "action"> & {
  loader?: UserDataFunction<TRequest, TContext, any>;
  action?: UserDataFunction<TRequest, TContext, any>;
};

export function createHandler<Routes extends readonly RouteConfig<any, any>[]>(
  routes: Routes,
  options?: {
    onError?: (error: unknown) => void;
  }
) {
  const handler = unstable_createStaticHandler(
    routes.map((route) => ({
      ...route,
      loader: route.loader ? dataFunction(route.loader) : undefined,
      action: route.action ? dataFunction(route.action) : undefined,
    }))
  );

  type DataResult<Func extends UserDataFunction<any, any, any> | undefined> =
    Func extends undefined ? never : Awaited<ReturnType<Func>>;

  type TypeResponseOnly<T> = T extends JsonResponse<any, any> ? T : never;

  type RouteType = Routes extends (infer U)[]
    ? U
    : { action: never; loader: never };
  type JsonResponseType =
    | TypeResponseOnly<DataResult<RouteType["action"]>>
    | TypeResponseOnly<DataResult<RouteType["loader"]>>;

  return async <RequestContext = unknown>(
    request: Request,
    requestContext: RequestContext
  ): Promise<JsonResponseType | UnknownResponse> => {
    try {
      const context = await handler.queryRoute(request);

      if (isResponse(context)) {
        return context as UnknownResponse;
      }

      return json({ message: "Not found" }, 404);
    } catch (reason) {
      if (options?.onError) {
        options.onError(reason);
      } else {
        console.error(reason);
      }

      if (isRouteErrorResponse(reason)) {
        return json({ message: reason.statusText }, 500);
      }

      return json({ message: "Internal Server Error" }, 500);
    }
  };
}

function isResponse(value: any): value is Response {
  return (
    value != null &&
    typeof value.status === "number" &&
    typeof value.statusText === "string" &&
    typeof value.headers === "object" &&
    typeof value.body !== "undefined"
  );
}
