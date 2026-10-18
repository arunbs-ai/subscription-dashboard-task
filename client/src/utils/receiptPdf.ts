import type { Invoice } from '../types';
import { toTitleCase } from './text';
import { env } from '../config/env';

interface ReceiptCustomer {
  name?: string;
  email?: string;
  company?: string;
}

const BRAND: [number, number, number] = [124, 83, 255]; // #7C53FF
const DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export const downloadReceiptPdf = async (inv: Invoice, customer: ReceiptCustomer) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 96, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(env.appName, M, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Payment Receipt', M, 72);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(inv.id, W - M, 52, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(fmtDate(inv.date), W - M, 72, { align: 'right' });

  let y = 148;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text('BILLED TO', M, y);
  doc.text('PAYMENT STATUS', W / 2 + 20, y);
  y += 18;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(customer.name || 'Customer', M, y);
  doc.text(toTitleCase(inv.status), W / 2 + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  if (customer.email) doc.text(customer.email, M, y + 16);
  if (customer.company) doc.text(customer.company, M, y + 30);

  y = 250;
  doc.setFillColor(245, 242, 255);
  doc.rect(M, y, W - M * 2, 28, 'F');
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION', M + 12, y + 18);
  doc.text('TYPE', W - M - 230, y + 18);
  doc.text('BILLING', W - M - 150, y + 18);
  doc.text('AMOUNT', W - M - 12, y + 18, { align: 'right' });

  y += 28;
  const kind = inv.changeType === 'upgrade' ? 'Upgrade' : inv.changeType === 'downgrade' ? 'Downgrade' : 'Purchase';
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const descLines = doc.splitTextToSize(inv.description || inv.planName || 'Subscription', W - M * 2 - 260);
  doc.text(descLines, M + 12, y + 20);
  doc.text(kind, W - M - 230, y + 20);
  doc.text(inv.billingCycle ? toTitleCase(inv.billingCycle) : '-', W - M - 150, y + 20);
  doc.text(`$${inv.amount.toFixed(2)}`, W - M - 12, y + 20, { align: 'right' });

  const rowH = Math.max(40, descLines.length * 14 + 24);
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y + rowH, W - M, y + rowH);

  y += rowH + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total Paid', W - M - 150, y);
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text(`$${inv.amount.toFixed(2)} ${inv.currency}`, W - M, y, { align: 'right' });

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Thank you for choosing ${env.appName}. This receipt was generated automatically.`, M, 790);
  doc.text(`Generated on ${fmtDate(new Date().toISOString())}`, M, 804);

  doc.save(`${inv.id}.pdf`);
};
