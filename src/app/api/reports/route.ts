import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const reports = await prisma.damReport.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: reports });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching reports";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if bulk array
    if (Array.isArray(body)) {
      const createdList = await prisma.$transaction(
        body.map((item) =>
          prisma.damReport.create({
            data: {
              damName: item.dam_name,
              dateStr: item.date_str,
              timeRange: item.time_range,
              condition: item.condition,
              qInflowDkd: item.q_inflow_dkd,
              qOutflowDkd: item.q_outflow_dkd,
              mricanKiri: item.mrican_kiri,
              mricanKanan: item.mrican_kanan,
              siagaStatus: item.siaga_status,
              outflowHourly: item.outflow_hourly || [],
              outAverage: item.out_average,
              elvAktual: item.elvAktual ?? item.elv_aktual,
              cuaca: item.cuaca,
              shiftInfo: item.shift_info,
              officers: item.officers || [],
              rawText: item.raw_text,
            },
          })
        )
      );
      return NextResponse.json({ success: true, count: createdList.length, data: createdList });
    }

    const created = await prisma.damReport.create({
      data: {
        damName: body.dam_name,
        dateStr: body.date_str,
        timeRange: body.time_range,
        condition: body.condition,
        qInflowDkd: body.q_inflow_dkd,
        qOutflowDkd: body.q_outflow_dkd,
        mricanKiri: body.mrican_kiri,
        mricanKanan: body.mrican_kanan,
        siagaStatus: body.siaga_status,
        outflowHourly: body.outflow_hourly || [],
        outAverage: body.out_average,
        elvAktual: body.elvAktual ?? body.elv_aktual,
        cuaca: body.cuaca,
        shiftInfo: body.shift_info,
        officers: body.officers || [],
        rawText: body.raw_text,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error creating report";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }
    await prisma.damReport.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting report";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
