import { apiError } from "@/lib/http";
import { requireSession } from "@/lib/session";

export async function GET() {
  try { return Response.json({ user: await requireSession() }); }
  catch (error) { return apiError(error); }
}
