export function createJsonRequest(body: unknown) {
  const payload =
    typeof body === "string" ? body : JSON.stringify(body ?? {}, null, 2);

  return new Request("http://example.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}
