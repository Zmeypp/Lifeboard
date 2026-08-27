export async function GET() {
  return Response.json({
    success: true,
    service: "lifeboard",
    name: "LifeBoard",
    version: "1.0.0",
    device: "raspberry",
    timestamp: Date.now(),
  });
}