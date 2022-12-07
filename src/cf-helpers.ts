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

interface TypedURLSearchParams<
  SearchParams extends { [key: string]: Description }
> extends Omit<URLSearchParams, "get" | "getAll"> {
  get(name: keyof SearchParams): string | null;
  getAll(name: keyof SearchParams): Array<string | null>;
}

interface TypedURL<
  Pathname extends URLPathname,
  SearchParams extends { [key: string]: Description }
> extends Omit<URL, "pathname" | "searchParams"> {
  pathname: Pathname;
  searchParams: TypedURLSearchParams<SearchParams>;
}

export interface TypedRequest<
  Method extends RequestMethod,
  Pathname extends URLPathname,
  SearchParams extends { [key: string]: Description } = {}
> extends Omit<Request, "method"> {
  method: Method;
  typedURL: TypedURL<Pathname, SearchParams>;
}

export function typeRequest<TRequest extends TypedRequest<any, any, any>>(
  request: Request
): TRequest {
  const result = request as TRequest;
  result.typedURL = new URL(request.url) as TypedURL<any, any>;

  return result;
}

export function json<T>(value: T, status: number = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
