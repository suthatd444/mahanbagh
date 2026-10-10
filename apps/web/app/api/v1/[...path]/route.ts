import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl = process.env.API_BASE_URL ?? "https://crm.mohanbagh.in/backend/api/v1";

async function proxy(request: NextRequest, path: string[]) {
  const method = request.method;
  const headers = new Headers({ Accept: "application/json" });
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");

  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);

  const backendResponse = await fetch(
    `${apiBaseUrl}/${path.join("/")}${request.nextUrl.search}`,
    {
      method,
      headers,
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
    },
  );
  const response = new NextResponse(await backendResponse.arrayBuffer(), {
    status: backendResponse.status,
    headers: {
      "content-type":
        backendResponse.headers.get("content-type") ?? "application/json",
    },
  });
  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);

  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}
