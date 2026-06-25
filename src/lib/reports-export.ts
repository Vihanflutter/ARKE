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
