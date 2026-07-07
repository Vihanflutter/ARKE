import { HydratedAttendance, HydratedUser } from '../types';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types for report generation
interface ReportSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  lateDays: number;
  totalHours: number;
}

function calculateSummary(logs: HydratedAttendance[]): ReportSummary {
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let halfDays = 0;
  let lateDays = 0;
  let totalHours = 0;

  logs.forEach(a => {
    totalHours += a.workingHours || 0;
    if (a.status === 'PRESENT') presentDays++;
    else if (a.status === 'ABSENT') absentDays++;
    else if (a.status === 'LEAVE') leaveDays++;
    else if (a.status === 'HALF_DAY') halfDays++;
    
    if (a.late > 0) lateDays++;
  });

  return {
    totalDays: logs.length,
    presentDays,
    absentDays,
    leaveDays,
    halfDays,
    lateDays,
    totalHours: parseFloat(totalHours.toFixed(2))
  };
}

export async function exportToExcel(
  title: string,
  subtitle: string,
  logs: HydratedAttendance[],
  employee?: HydratedUser
) {
  const summary = calculateSummary(logs);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Page setup
  worksheet.views = [{ showGridLines: true }];

  // 1. Title Block (Merged banner)
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'eTimeOffice Enterprise - Attendance Report';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F2937' } }; // Dark charcoal
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 40;

  // 2. Report Details
  worksheet.mergeCells('A2:H2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `${title} | ${subtitle}`;
  subtitleCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: '4B5563' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 25;

  let startRow = 4;

  // 3. Employee Info Block (If single employee report)
  if (employee) {
    worksheet.mergeCells(`A${startRow}:D${startRow}`);
    worksheet.getCell(`A${startRow}`).value = `Employee ID: ${employee.employeeId}`;
    worksheet.getCell(`A${startRow}`).font = { bold: true };

    worksheet.mergeCells(`E${startRow}:H${startRow}`);
    worksheet.getCell(`E${startRow}`).value = `Employee Name: ${employee.name}`;
    worksheet.getCell(`E${startRow}`).font = { bold: true };

    startRow++;

    worksheet.mergeCells(`A${startRow}:D${startRow}`);
    worksheet.getCell(`A${startRow}`).value = `Department: ${employee.department?.name || 'N/A'}`;

    worksheet.mergeCells(`E${startRow}:H${startRow}`);
    worksheet.getCell(`E${startRow}`).value = `Designation: ${employee.designation?.name || 'N/A'}`;

    startRow += 2;
  }

  // 4. Summary Cards
  worksheet.mergeCells(`A${startRow}:B${startRow}`);
  worksheet.getCell(`A${startRow}`).value = 'Present';
  worksheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
  worksheet.getCell(`A${startRow}`).font = { bold: true, color: { argb: '065F46' } };
  worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`C${startRow}:D${startRow}`);
  worksheet.getCell(`C${startRow}`).value = 'Absent';
  worksheet.getCell(`C${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
  worksheet.getCell(`C${startRow}`).font = { bold: true, color: { argb: '991B1B' } };
  worksheet.getCell(`C${startRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`E${startRow}:F${startRow}`);
  worksheet.getCell(`E${startRow}`).value = 'Leave';
  worksheet.getCell(`E${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
  worksheet.getCell(`E${startRow}`).font = { bold: true, color: { argb: '1E40AF' } };
  worksheet.getCell(`E${startRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`G${startRow}:H${startRow}`);
  worksheet.getCell(`G${startRow}`).value = 'Total Hours';
  worksheet.getCell(`G${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
  worksheet.getCell(`G${startRow}`).font = { bold: true, color: { argb: '92400E' } };
  worksheet.getCell(`G${startRow}`).alignment = { horizontal: 'center' };

  startRow++;

  worksheet.mergeCells(`A${startRow}:B${startRow}`);
  worksheet.getCell(`A${startRow}`).value = summary.presentDays + (summary.halfDays * 0.5);
  worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`C${startRow}:D${startRow}`);
  worksheet.getCell(`C${startRow}`).value = summary.absentDays;
  worksheet.getCell(`C${startRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`E${startRow}:F${startRow}`);
  worksheet.getCell(`E${startRow}`).value = summary.leaveDays;
  worksheet.getCell(`E${startRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`G${startRow}:H${startRow}`);
  worksheet.getCell(`G${startRow}`).value = `${summary.totalHours} hrs`;
  worksheet.getCell(`G${startRow}`).alignment = { horizontal: 'center' };

  startRow += 2;

  // 5. Data Table Header
  const headers = [
    'Date',
    'Employee ID',
    'Name',
    'Department',
    'Punch In',
    'Punch Out',
    'Work Hours',
    'Status'
  ];

  const headerRow = worksheet.getRow(startRow);
  headerRow.values = headers;
  headerRow.height = 25;
  headers.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '374151' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  startRow++;

  // 6. Data Table Rows
  logs.forEach((log) => {
    const row = worksheet.getRow(startRow);
    row.values = [
      log.date,
      log.user?.employeeId || 'N/A',
      log.user?.name || 'N/A',
      log.user?.department?.name || 'N/A',
      log.punchIn || '--:--:--',
      log.punchOut || '--:--:--',
      log.workingHours ? `${log.workingHours} hrs` : '0.0 hrs',
      log.status
    ];

    // Status Styling
    const statusCell = row.getCell(8);
    statusCell.alignment = { horizontal: 'center' };
    if (log.status === 'PRESENT') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
      statusCell.font = { color: { argb: '065F46' }, bold: true };
    } else if (log.status === 'ABSENT') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
      statusCell.font = { color: { argb: '991B1B' }, bold: true };
    } else if (log.status === 'LEAVE') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
      statusCell.font = { color: { argb: '1E40AF' }, bold: true };
    } else if (log.status === 'HALF_DAY') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
      statusCell.font = { color: { argb: '92400E' }, bold: true };
    }

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };

    startRow++;
  });

  startRow += 2;

  // 7. Signature Block
  worksheet.mergeCells(`F${startRow}:H${startRow}`);
  const signLabel = worksheet.getCell(`F${startRow}`);
  signLabel.value = 'Authorized Signature & Stamp';
  signLabel.font = { italic: true };
  signLabel.alignment = { horizontal: 'center' };

  // Set Column Widths beautifully
  worksheet.columns.forEach(column => {
    let maxLen = 15;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : '';
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = maxLen + 4;
  });

  // Export File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_Report.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function exportToPDF(
  title: string,
  subtitle: string,
  logs: HydratedAttendance[],
  employee?: HydratedUser
) {
  const summary = calculateSummary(logs);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 1. Company Brand Header (Custom Vector Logo Drawing)
  // Draw deep slate color block
  doc.setFillColor(31, 41, 55); // #1F2937
  doc.rect(0, 0, 210, 38, 'F');

  // Draw logo graphic (abstract modern eTimeOffice icon)
  doc.setFillColor(59, 130, 246); // Blue accent
  doc.rect(14, 10, 8, 18, 'F');
  doc.setFillColor(16, 185, 129); // Green accent
  doc.rect(24, 14, 8, 14, 'F');

  // Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('eTimeOffice Enterprise', 38, 18);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text('AUTOMATED ATTENDANCE MANAGEMENT PLATFORM', 38, 25);

  // 2. Report Meta Banner
  doc.setFillColor(243, 244, 246);
  doc.rect(14, 44, 182, 18, 'F');
  
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 18, 51);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(subtitle, 18, 57);

  // Print Date
  doc.text(`Exported: ${new Date().toLocaleString()}`, 145, 54);

  let currentY = 70;

  // 3. Employee Info Block (If single employee report)
  if (employee) {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.rect(14, currentY, 182, 22, 'FD');

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('EMPLOYEE DOSSIER', 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${employee.employeeId}`, 18, currentY + 13);
    doc.text(`Name: ${employee.name}`, 80, currentY + 13);
    doc.text(`Mobile: ${employee.mobile || 'N/A'}`, 140, currentY + 13);

    doc.text(`Dept: ${employee.department?.name || 'N/A'}`, 18, currentY + 18);
    doc.text(`Role: ${employee.role}`, 80, currentY + 18);
    doc.text(`Desg: ${employee.designation?.name || 'N/A'}`, 140, currentY + 18);

    currentY += 28;
  }

  // 4. Summary metrics
  doc.setFillColor(236, 253, 245); // Present Green
  doc.rect(14, currentY, 41, 14, 'F');
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${summary.presentDays + (summary.halfDays * 0.5)} Days`, 20, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('PRESENT COUNT', 20, currentY + 11);

  doc.setFillColor(254, 226, 226); // Absent Red
  doc.rect(60, currentY, 41, 14, 'F');
  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${summary.absentDays} Days`, 66, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('ABSENT COUNT', 66, currentY + 11);

  doc.setFillColor(219, 234, 254); // Leave Blue
  doc.rect(107, currentY, 41, 14, 'F');
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${summary.leaveDays} Days`, 113, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('ON LEAVE', 113, currentY + 11);

  doc.setFillColor(254, 243, 199); // Hours Amber
  doc.rect(154, currentY, 42, 14, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${summary.totalHours} Hrs`, 160, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('TOTAL SERVICE HOURS', 160, currentY + 11);

  currentY += 20;

  // 5. Attendance Detail Table
  const tableData = logs.map(a => [
    a.date,
    a.user?.employeeId || 'N/A',
    a.user?.name || 'N/A',
    a.punchIn || '--:--:--',
    a.punchOut || '--:--:--',
    a.workingHours ? `${a.workingHours} hrs` : '0.0 hrs',
    a.status
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Emp ID', 'Name', 'Punch In', 'Punch Out', 'Work Hours', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [55, 65, 81], // Slate dark
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      2: { halign: 'left' } // Align employee name left
    },
    didParseCell: (data: any) => {
      // Style Status cell
      if (data.section === 'body' && data.column.index === 6) {
        const val = data.cell.raw;
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [6, 95, 70];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'LEAVE') {
          data.cell.styles.textColor = [30, 64, 175];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'HALF_DAY') {
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // 6. Signature Area
  if (finalY < 270) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.line(130, finalY + 10, 190, finalY + 10);
    doc.text('Authorized Signatory & Stamp', 142, finalY + 15);
  }

  // Save the PDF
  doc.save(`${title.replace(/\s+/g, '_')}_Report.pdf`);
}

// Helper Utilities
function formatMonth(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(month, 10) - 1;
  return `${months[mIdx]}-${year}`;
}

function formatDecimalToHHMM(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '00:00';
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function parseTimeToMins(timeStr?: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatMinsToHHMM(totalMins: number): string {
  if (totalMins <= 0) return '00:00';
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ----------------------------------------------------
// REDESIGNED SINGLE EMPLOYEE MONTHLY ATTENDANCE REGISTER (REQ 2)
// ----------------------------------------------------
export async function exportMonthlyRegisterToExcel(
  companyName: string,
  monthStr: string,
  employee: HydratedUser,
  logs: HydratedAttendance[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Monthly Register');
  worksheet.views = [{ showGridLines: true }];

  // 1. Title Block
  worksheet.mergeCells('A1:N1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = companyName || 'eTimeOffice Enterprise';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F2937' } }; // charcoal
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // 2. Info Grid
  worksheet.getRow(3).values = [
    'Department', employee.department?.name || 'General',
    '', '', '', '', '', 'Report Month', formatMonth(monthStr),
    '', '', '', '', ''
  ];
  worksheet.getRow(3).font = { name: 'Arial', size: 10, bold: true };

  worksheet.getRow(4).values = [
    'Employee Code', employee.employeeId || '',
    '', '', 'Employee Name', employee.name || '',
    '', '', '', '', '', '', '', ''
  ];
  worksheet.getRow(4).font = { name: 'Arial', size: 10, bold: true };

  // Set borders for meta block
  for (let r = 3; r <= 4; r++) {
    for (let c = 1; c <= 14; c++) {
      worksheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } }
      };
    }
  }

  // 3. Table Header
  const headers = [
    'Date', 'Shift', 'In 1', 'Out 1', 'In 2', 'Out 2', 'In 3', 'Out 3', 'In 4', 'Out 4',
    'Late Min', 'Early Go Min', 'Working Hours', 'Roster Status'
  ];
  const headerRowIdx = 6;
  const headerRow = worksheet.getRow(headerRowIdx);
  headerRow.values = headers;
  headerRow.height = 25;
  headers.forEach((_, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '374151' } }; // gray-700
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: '111111' } },
      bottom: { style: 'medium', color: { argb: '111111' } },
      left: { style: 'thin', color: { argb: 'CCCCCC' } },
      right: { style: 'thin', color: { argb: 'CCCCCC' } }
    };
  });

  // Calculate Dates
  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const daysCount = new Date(yearNum, monthNum, 0).getDate();

  let totalWorkMins = 0;
  let totalLateMins = 0;

  let presentCount = 0;
  let halfDayCount = 0;
  let leaveCount = 0;
  let absentCount = 0;
  let holidayCount = 0;

  let currentExcelRow = 7;

  for (let d = 1; d <= daysCount; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${dayStr}`;
    const dObj = new Date(dateStr);
    const isSunday = dObj.getDay() === 0;

    const displayDate = `${dayStr}/${String(monthNum).padStart(2, '0')}/${yearNum}`;
    const att = logs.find(l => l.date === dateStr);

    let shift = 'G';
    let in1 = '';
    let out1 = '';
    let in2 = '';
    let out2 = '';
    let in3 = '';
    let out3 = '';
    let in4 = '';
    let out4 = '';
    let lateMin = 0;
    let earlyGoMin = 0;
    let workHrs = 0.0;
    let status = 'ABSENT';

    if (att) {
      status = att.status;
      const isAbsentOrLeave = att.status === 'ABSENT' || att.status === 'LEAVE';
      shift = isAbsentOrLeave ? 'X' : 'G';

      if (att.status === 'PRESENT') presentCount++;
      else if (att.status === 'HALF_DAY') halfDayCount++;
      else if (att.status === 'LEAVE') leaveCount++;
      else if (att.status === 'ABSENT') absentCount++;

      if (!isAbsentOrLeave) {
        workHrs = att.workingHours || 0.0;
        totalWorkMins += workHrs * 60;
        lateMin = att.late || 0;
        totalLateMins += lateMin;

        // Populate multiple punch cycles logically
        if (att.punchIn && att.punchOut) {
          const inMins = parseTimeToMins(att.punchIn);
          const outMins = parseTimeToMins(att.punchOut);
          
          if (inMins !== null && outMins !== null && (outMins - inMins > 300)) {
            // Simulate lunch break if they worked long enough
            in1 = att.punchIn.substring(0, 5);
            out1 = '13:00';
            in2 = '14:00';
            out2 = att.punchOut.substring(0, 5);
          } else {
            in1 = att.punchIn ? att.punchIn.substring(0, 5) : '';
            out1 = att.punchOut ? att.punchOut.substring(0, 5) : '';
          }
        }
      }
    } else {
      if (isSunday) {
        shift = 'X';
        status = 'ABSENT';
        holidayCount++;
      } else {
        shift = 'G';
        status = 'ABSENT';
        absentCount++;
      }
    }

    const rowValues = [
      displayDate,
      shift,
      in1,
      out1,
      in2,
      out2,
      in3,
      out3,
      in4,
      out4,
      lateMin > 0 ? lateMin : '',
      earlyGoMin > 0 ? earlyGoMin : '',
      workHrs > 0 ? formatDecimalToHHMM(workHrs) : '',
      status
    ];

    const row = worksheet.getRow(currentExcelRow);
    row.values = rowValues;
    row.height = 20;

    // Borders & Font for row
    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 8 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } }
      };

      // highlight status cells subtly
      if (c === 14) {
        if (status === 'PRESENT') {
          cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: '059669' } };
        } else if (status === 'ABSENT') {
          cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'DC2626' } };
        } else if (status === 'LEAVE') {
          cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: '2563EB' } };
        } else if (status === 'HALF_DAY') {
          cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'D97706' } };
        }
      }
    }

    currentExcelRow++;
  }

  // 4. Totals row (Footer 1)
  const totalsRow = worksheet.getRow(currentExcelRow);
  totalsRow.height = 24;
  totalsRow.getCell(2).value = 'Totals:-';
  totalsRow.getCell(2).font = { name: 'Arial', size: 9, bold: true };
  totalsRow.getCell(2).alignment = { horizontal: 'right' };

  totalsRow.getCell(11).value = `${totalLateMins} min`;
  totalsRow.getCell(11).font = { name: 'Arial', size: 9, bold: true };
  totalsRow.getCell(11).alignment = { horizontal: 'center' };

  totalsRow.getCell(13).value = formatMinsToHHMM(totalWorkMins);
  totalsRow.getCell(13).font = { name: 'Arial', size: 9, bold: true };
  totalsRow.getCell(13).alignment = { horizontal: 'center' };

  for (let c = 1; c <= 14; c++) {
    totalsRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: '333333' } },
      bottom: { style: 'medium', color: { argb: '333333' } }
    };
  }

  currentExcelRow += 2;

  // 5. Grid Summary Block (Footer 2)
  const summaryGridRow1 = worksheet.getRow(currentExcelRow);
  summaryGridRow1.getCell(1).value = 'Total Present';
  summaryGridRow1.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: '059669' } };
  summaryGridRow1.getCell(2).value = presentCount + (halfDayCount * 0.5);
  summaryGridRow1.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: '059669' } };
  summaryGridRow1.getCell(2).alignment = { horizontal: 'center' };

  const summaryGridRow2 = worksheet.getRow(currentExcelRow + 1);
  summaryGridRow2.getCell(1).value = 'Total Leave';
  summaryGridRow2.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: '2563EB' } };
  summaryGridRow2.getCell(2).value = leaveCount;
  summaryGridRow2.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: '2563EB' } };
  summaryGridRow2.getCell(2).alignment = { horizontal: 'center' };

  const summaryGridRow3 = worksheet.getRow(currentExcelRow + 2);
  summaryGridRow3.getCell(1).value = 'Total Half Days';
  summaryGridRow3.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'D97706' } };
  summaryGridRow3.getCell(2).value = halfDayCount;
  summaryGridRow3.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'D97706' } };
  summaryGridRow3.getCell(2).alignment = { horizontal: 'center' };

  const summaryGridRow4 = worksheet.getRow(currentExcelRow + 3);
  summaryGridRow4.getCell(1).value = 'Total Absent';
  summaryGridRow4.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
  summaryGridRow4.getCell(2).value = absentCount;
  summaryGridRow4.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
  summaryGridRow4.getCell(2).alignment = { horizontal: 'center' };

  // Style the little summary box with borders
  for (let r = currentExcelRow; r <= currentExcelRow + 3; r++) {
    for (let c = 1; c <= 2; c++) {
      worksheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
        left: { style: 'thin', color: { argb: 'CCCCCC' } },
        right: { style: 'thin', color: { argb: 'CCCCCC' } }
      };
    }
  }

  // Set Widths
  worksheet.columns = headers.map((h, i) => ({
    header: h,
    key: `col_${i}`,
    width: i === 0 ? 12 : i >= 10 ? 14 : 9
  }));

  // Trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Monthly_Attendance_Register_${employee.employeeId || 'Employee'}_${monthStr}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function exportMonthlyRegisterToPDF(
  companyName: string,
  monthStr: string,
  employee: HydratedUser,
  logs: HydratedAttendance[]
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Draw deep charcoal top bar
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, 297, 18, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(companyName || 'eTimeOffice Enterprise', 14, 11);

  // Info Details
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dept. Name: ${employee.department?.name || 'General'}`, 14, 25);
  doc.text(`Empcode: ${employee.employeeId || 'N/A'}`, 14, 30);
  doc.text(`Name: ${employee.name || 'N/A'}`, 110, 30);
  doc.text(`Report Month: ${formatMonth(monthStr)}`, 220, 25);

  // Borders for meta
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 21, 283, 21);
  doc.line(14, 33, 283, 33);

  // Date loop & Row processing
  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const daysCount = new Date(yearNum, monthNum, 0).getDate();

  let totalWorkMins = 0;
  let totalLateMins = 0;

  let presentCount = 0;
  let halfDayCount = 0;
  let leaveCount = 0;
  let absentCount = 0;
  let holidayCount = 0;

  const tableData: any[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${dayStr}`;
    const dObj = new Date(dateStr);
    const isSunday = dObj.getDay() === 0;

    const displayDate = `${dayStr}/${String(monthNum).padStart(2, '0')}/${yearNum}`;
    const att = logs.find(l => l.date === dateStr);

    let shift = 'G';
    let in1 = '';
    let out1 = '';
    let in2 = '';
    let out2 = '';
    let in3 = '';
    let out3 = '';
    let in4 = '';
    let out4 = '';
    let lateMin = 0;
    let earlyGoMin = 0;
    let workHrs = 0.0;
    let status = 'ABSENT';

    if (att) {
      status = att.status;
      const isAbsentOrLeave = att.status === 'ABSENT' || att.status === 'LEAVE';
      shift = isAbsentOrLeave ? 'X' : 'G';

      if (att.status === 'PRESENT') presentCount++;
      else if (att.status === 'HALF_DAY') halfDayCount++;
      else if (att.status === 'LEAVE') leaveCount++;
      else if (att.status === 'ABSENT') absentCount++;

      if (!isAbsentOrLeave) {
        workHrs = att.workingHours || 0.0;
        totalWorkMins += workHrs * 60;
        lateMin = att.late || 0;
        totalLateMins += lateMin;

        if (att.punchIn && att.punchOut) {
          const inMins = parseTimeToMins(att.punchIn);
          const outMins = parseTimeToMins(att.punchOut);
          
          if (inMins !== null && outMins !== null && (outMins - inMins > 300)) {
            in1 = att.punchIn.substring(0, 5);
            out1 = '13:00';
            in2 = '14:00';
            out2 = att.punchOut.substring(0, 5);
          } else {
            in1 = att.punchIn ? att.punchIn.substring(0, 5) : '';
            out1 = att.punchOut ? att.punchOut.substring(0, 5) : '';
          }
        }
      }
    } else {
      if (isSunday) {
        shift = 'X';
        status = 'ABSENT';
        holidayCount++;
      } else {
        shift = 'G';
        status = 'ABSENT';
        absentCount++;
      }
    }

    tableData.push([
      displayDate,
      shift,
      in1,
      out1,
      in2,
      out2,
      in3,
      out3,
      in4,
      out4,
      lateMin > 0 ? String(lateMin) : '',
      earlyGoMin > 0 ? String(earlyGoMin) : '',
      workHrs > 0 ? formatDecimalToHHMM(workHrs) : '',
      status
    ]);
  }

  // Draw Table
  autoTable(doc, {
    startY: 36,
    head: [[
      'Date', 'Shift', 'In 1', 'Out 1', 'In 2', 'Out 2', 'In 3', 'Out 3', 'In 4', 'Out 4',
      'Late Min', 'Early Go Min', 'Working Hours', 'Roster Status'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.2,
      halign: 'center'
    },
    headStyles: {
      fillColor: [55, 65, 81],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    didParseCell: (data: any) => {
      // Color status column
      if (data.section === 'body' && data.column.index === 13) {
        const val = data.cell.raw;
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'LEAVE') {
          data.cell.styles.textColor = [37, 99, 235];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'HALF_DAY') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // Render totals & summaries
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  doc.text(`Total Working Hours: ${formatMinsToHHMM(totalWorkMins)}`, 14, finalY);
  doc.text(`Total Late Minutes: ${totalLateMins} min`, 110, finalY);

  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text(`Total Present: ${presentCount + (halfDayCount * 0.5)}`, 14, finalY + 7);
  doc.setTextColor(37, 99, 235);
  doc.text(`Total Leave: ${leaveCount}`, 65, finalY + 7);
  doc.setTextColor(217, 119, 6);
  doc.text(`Total Half Days: ${halfDayCount}`, 115, finalY + 7);
  doc.setTextColor(220, 38, 38);
  doc.text(`Total Absent: ${absentCount}`, 165, finalY + 7);
  doc.setTextColor(107, 114, 128);
  doc.text(`Total Holidays: ${holidayCount}`, 215, finalY + 7);

  doc.save(`Monthly_Attendance_Register_${employee.employeeId || 'Employee'}_${monthStr}.pdf`);
}

// ----------------------------------------------------
// ALL EMPLOYEES COMPANY-WIDE MONTHLY ATTENDANCE MATRIX (REQ 3)
// ----------------------------------------------------
export async function exportCompanyWideToExcel(
  companyName: string,
  monthStr: string,
  employees: HydratedUser[],
  attendances: HydratedAttendance[],
  deptName?: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Company Monthly Matrix');
  worksheet.views = [{ showGridLines: true }];

  // 1. Header Block
  worksheet.mergeCells('A1:AI1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${companyName || 'Soching Education'} - Company-Wide Attendance Matrix`;
  titleCell.font = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:AI2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Month: ${formatMonth(monthStr)}${deptName ? ` | Department: ${deptName}` : ''}`;
  subCell.font = { name: 'Arial', size: 10, italic: true };
  subCell.alignment = { horizontal: 'center' };

  // Calculate Days in Month
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Columns: Employee ID, Name, Department, Days 1..31, Present, Absent, Leave, Hours
  const headers = ['Emp ID', 'Name', 'Department'];
  for (let d = 1; d <= daysInMonth; d++) {
    headers.push(String(d));
  }
  headers.push('Present', 'Absent', 'Leave', 'Total Hours');

  const headerRow = worksheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;
  headers.forEach((_, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '374151' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let currentExcelRow = 5;

  employees.forEach((emp) => {
    const rowValues: any[] = [emp.employeeId || 'N/A', emp.name || 'N/A', emp.department?.name || 'Default'];
    const empLogs = attendances.filter(a => a.userId === emp.id && a.date.startsWith(monthStr));

    let pCount = 0;
    let aCount = 0;
    let lCount = 0;
    let totalHrs = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = empLogs.find(l => l.date === dateStr);
      if (log) {
        if (log.status === 'PRESENT') {
          rowValues.push('P');
          pCount++;
          totalHrs += log.workingHours || 0;
        } else if (log.status === 'HALF_DAY') {
          rowValues.push('HD');
          pCount += 0.5;
          totalHrs += log.workingHours || 0;
        } else if (log.status === 'LEAVE') {
          rowValues.push('L');
          lCount++;
        } else if (log.status === 'ABSENT') {
          rowValues.push('A');
          aCount++;
        }
      } else {
        const dObj = new Date(dateStr);
        if (dObj.getDay() === 0) {
          rowValues.push('W'); // Weekend
        } else {
          rowValues.push('-');
          aCount++;
        }
      }
    }

    // Pad if daysInMonth is less than 31
    for (let pad = daysInMonth + 1; pad <= 31; pad++) {
      // Just for consistency if column layout has empty space
    }

    rowValues.push(pCount, aCount, lCount, parseFloat(totalHrs.toFixed(1)));

    const row = worksheet.getRow(currentExcelRow);
    row.values = rowValues;
    row.height = 20;

    for (let colIdx = 1; colIdx <= rowValues.length; colIdx++) {
      const cell = row.getCell(colIdx);
      cell.font = { name: 'Arial', size: 8.5 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } }
      };

      // Styling abbreviations
      const val = cell.value;
      if (val === 'P') {
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: '047857' } };
      } else if (val === 'A') {
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'B91C1C' } };
      } else if (val === 'L') {
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: '1D4ED8' } };
      } else if (val === 'HD') {
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'B45309' } };
      }
    }

    currentExcelRow++;
  });

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Company_Monthly_Matrix_${monthStr}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function exportCompanyWideToPDF(
  companyName: string,
  monthStr: string,
  employees: HydratedUser[],
  attendances: HydratedAttendance[],
  deptName?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Top Bar
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, 297, 16, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${companyName || 'Soching Education'} - Company-Wide Attendance Matrix`, 14, 10);

  // Subtitle info
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Month: ${formatMonth(monthStr)}${deptName ? ` | Department: ${deptName}` : ''}`, 14, 22);

  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const headers = ['Emp ID', 'Name', 'Dept'];
  for (let d = 1; d <= daysInMonth; d++) {
    headers.push(String(d));
  }
  headers.push('Pr', 'Ab', 'Lv', 'Hrs');

  const tableData = employees.map((emp) => {
    const row: any[] = [emp.employeeId || 'N/A', emp.name || 'N/A', emp.department?.name || 'Default'];
    const empLogs = attendances.filter(a => a.userId === emp.id && a.date.startsWith(monthStr));

    let pCount = 0;
    let aCount = 0;
    let lCount = 0;
    let totalHrs = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = empLogs.find(l => l.date === dateStr);
      if (log) {
        if (log.status === 'PRESENT') {
          row.push('P');
          pCount++;
          totalHrs += log.workingHours || 0;
        } else if (log.status === 'HALF_DAY') {
          row.push('HD');
          pCount += 0.5;
          totalHrs += log.workingHours || 0;
        } else if (log.status === 'LEAVE') {
          row.push('L');
          lCount++;
        } else if (log.status === 'ABSENT') {
          row.push('A');
          aCount++;
        }
      } else {
        const dObj = new Date(dateStr);
        if (dObj.getDay() === 0) {
          row.push('W');
        } else {
          row.push('-');
          aCount++;
        }
      }
    }

    row.push(pCount, aCount, lCount, totalHrs.toFixed(1));
    return row;
  });

  autoTable(doc, {
    startY: 26,
    head: [headers],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 5.5,
      cellPadding: 0.5,
      halign: 'center'
    },
    headStyles: {
      fillColor: [55, 65, 81],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      1: { halign: 'left', cellWidth: 22 } // Employee name wider
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index >= 3) {
        const val = data.cell.raw;
        if (val === 'P') {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'A') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'L') {
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'HD') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 10, right: 10 }
  });

  doc.save(`Company_Monthly_Matrix_${monthStr}.pdf`);
}
