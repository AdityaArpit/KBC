import ExcelJS from 'exceljs';
import { AttendanceRecord, AttendanceSession, CampusEvent } from '../../shared/types.ts';

export interface AttendanceExportData {
  event: CampusEvent;
  session: AttendanceSession;
  records: AttendanceRecord[];
  totalRegistered: number;
}

export async function generateAttendanceWorkbook(data: AttendanceExportData): Promise<Buffer> {
  const { event, session, records, totalRegistered } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KBC Event Command Center';
  workbook.lastModifiedBy = 'KIIT Campus Operations';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ----------------------------------------------------
  // Sheet 1: Attendance
  // ----------------------------------------------------
  const attendanceSheet = workbook.addWorksheet('Attendance', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  attendanceSheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Roll Number', key: 'rollNumber', width: 18 },
    { header: 'Person Type', key: 'personType', width: 16 },
    { header: 'Accommodation', key: 'accommodation', width: 18 },
    { header: 'Hostel', key: 'hostel', width: 20 },
    { header: 'Hostel Email', key: 'hostelEmail', width: 25 },
    { header: 'Event', key: 'event', width: 30 },
    { header: 'Attendance Session', key: 'session', width: 25 },
    { header: 'Marked At', key: 'markedAt', width: 22 },
  ];

  // Header style: clean KIIT brand styling
  const headerRow = attendanceSheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // KIIT Teal
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  // Populate records
  records.forEach((r) => {
    const isDayScholar = r.accommodationSnapshot === 'DAY_SCHOLAR';
    attendanceSheet.addRow({
      name: r.nameSnapshot,
      email: r.emailSnapshot,
      rollNumber: r.rollNumberSnapshot || 'N/A',
      personType: r.personTypeSnapshot,
      accommodation: r.accommodationSnapshot,
      hostel: isDayScholar ? 'N/A' : (r.hostelSnapshot || 'N/A'),
      hostelEmail: isDayScholar ? 'N/A' : (r.hostelEmailSnapshot || 'N/A'),
      event: event.name,
      session: session.name,
      markedAt: new Date(r.markedAt).toLocaleString(),
    });
  });

  // ----------------------------------------------------
  // Sheet 2: Summary
  // ----------------------------------------------------
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  summarySheet.columns = [
    { header: 'Event', key: 'event', width: 30 },
    { header: 'Session', key: 'session', width: 25 },
    { header: 'Total Registered', key: 'totalRegistered', width: 18 },
    { header: 'Total Present', key: 'totalPresent', width: 16 },
    { header: 'Attendance %', key: 'attendancePercentage', width: 16 },
    { header: 'Start Time', key: 'startTime', width: 22 },
    { header: 'End Time', key: 'endTime', width: 22 },
    { header: 'Generated At', key: 'generatedAt', width: 22 },
  ];

  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.height = 28;
  summaryHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Slate dark
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  const presentCount = records.length;
  const attendanceRate = totalRegistered > 0 ? `${((presentCount / totalRegistered) * 100).toFixed(1)}%` : '100%';

  summarySheet.addRow({
    event: event.name,
    session: session.name,
    totalRegistered: totalRegistered,
    totalPresent: presentCount,
    attendancePercentage: attendanceRate,
    startTime: new Date(session.startsAt).toLocaleString(),
    endTime: new Date(session.endsAt).toLocaleString(),
    generatedAt: new Date().toLocaleString(),
  });

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}
