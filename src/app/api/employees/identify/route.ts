import { prisma } from "@/lib/prisma";
import { apiError, AppError } from "@/lib/http";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requireSession();
    const value = new URL(request.url).searchParams.get("value")?.trim();
    if (!value) throw new AppError(422, "IDENTIFIER_REQUIRED", "Scan a QR code or enter an employee ID.");
    const employee = await prisma.employee.findFirst({ where: { OR: [{ employeeCode: { equals: value, mode: "insensitive" } }, { qrToken: value }] }, include: { assignments: { where: { endsAt: null, isPrimary: true }, include: { client: true, location: true }, take: 1 } } });
    if (!employee) throw new AppError(404, "EMPLOYEE_NOT_FOUND", `Employee ID ${value} was not found.`);
    const assignment = employee.assignments[0];
    return Response.json({ employee: { id: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, jobTitle: employee.jobTitle, status: employee.employmentStatus, client: assignment?.client.companyName ?? null, location: assignment?.location.name ?? null } });
  } catch (error) { return apiError(error); }
}
