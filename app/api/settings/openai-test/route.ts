import { NextResponse } from "next/server";

const ONE_BY_ONE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XGZ0AAAAASUVORK5CYII=",
  "base64",
);

type TestResult = {
  ok: boolean;
  endpoint: string;
  status?: number;
  message: string;
};

async function parseError(response: Response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };

    if (typeof parsed.error === "string") {
      return parsed.error;
    }

    return parsed.error?.message || parsed.message || text || `HTTP ${response.status}`;
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

async function testGenerations(baseUrl: string, apiKey: string, model: string): Promise<TestResult> {
  try {
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: "Connectivity test image",
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        endpoint: "images/generations",
        status: response.status,
        message: await parseError(response),
      };
    }

    return {
      ok: true,
      endpoint: "images/generations",
      status: response.status,
      message: "Generation endpoint is reachable.",
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: "images/generations",
      message: error instanceof Error ? error.message : "Generation request failed.",
    };
  }
}

async function testEdits(baseUrl: string, apiKey: string, model: string): Promise<TestResult> {
  try {
    const formData = new FormData();
    formData.append("model", model);
    formData.append("prompt", "Connectivity test edit");
    formData.append("size", "1024x1024");
    formData.append("quality", "high");
    formData.append("image", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "test.png");

    const response = await fetch(`${baseUrl}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      return {
        ok: false,
        endpoint: "images/edits",
        status: response.status,
        message: await parseError(response),
      };
    }

    return {
      ok: true,
      endpoint: "images/edits",
      status: response.status,
      message: "Edit endpoint is reachable.",
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: "images/edits",
      message: error instanceof Error ? error.message : "Edit request failed.",
    };
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    model?: string;
  };

  const apiKey = String(body.openaiApiKey ?? "").trim();
  const baseUrl = String(body.openaiBaseUrl ?? "").trim().replace(/\/$/, "");
  const model = String(body.model ?? "gpt-image-2").trim() || "gpt-image-2";

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { error: "OpenAI API key and base URL are required for connectivity testing." },
      { status: 400 },
    );
  }

  const [generations, edits] = await Promise.all([
    testGenerations(baseUrl, apiKey, model),
    testEdits(baseUrl, apiKey, model),
  ]);

  const ok = generations.ok || edits.ok;

  return NextResponse.json(
    {
      ok,
      model,
      baseUrl,
      results: [generations, edits],
    },
    { status: ok ? 200 : 502 },
  );
}
