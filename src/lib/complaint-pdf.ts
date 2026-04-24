import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction, formatINR, formatDateTime12, flagLabel, riskLabel } from "@/lib/upi";

interface MerchantInfo {
  shop_name: string;
  upi_id: string;
  city?: string | null;
}

export function generateComplaintPdf(args: {
  merchant: MerchantInfo;
  tx: Transaction;
  complaintText: string;
}) {
  const { merchant, tx, complaintText } = args;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("UPI SHIELD", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Cybercrime Complaint Document", pageW - 14, 14, { align: "right" });

  doc.setTextColor(0, 0, 0);
  let y = 32;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Complainant Details", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Shop name: ${merchant.shop_name}`, 14, y); y += 5;
  doc.text(`Shop UPI ID: ${merchant.upi_id}`, 14, y); y += 5;
  if (merchant.city) { doc.text(`City: ${merchant.city}`, 14, y); y += 5; }
  doc.text(`Filed on: ${new Date().toLocaleString("en-IN")}`, 14, y); y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Incident Details", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255 },
    head: [["Field", "Value"]],
    body: [
      ["Transaction ID", tx.id],
      ["Date / Time", formatDateTime12(tx.transaction_time)],
      ["Sender UPI ID", tx.sender_upi],
      ["Amount", formatINR(tx.amount)],
      ["Remark", tx.remark || "(none)"],
      ["Risk level", riskLabel(tx.risk_level)],
      ["Risk score", `${tx.risk_score}/100`],
      ["Fraud patterns identified", tx.flags.map(flagLabel).join(", ") || "None"],
    ],
  });

  // @ts-expect-error jsPDF lastAutoTable is added by autotable plugin
  y = (doc.lastAutoTable?.finalY ?? y) + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Formal Complaint Letter", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(complaintText, pageW - 28);
  doc.text(lines, 14, y);
  y = y + lines.length * 5 + 6;

  if (tx.recommended_actions?.length) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("Recommended Actions", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    tx.recommended_actions.forEach((a) => {
      const al = doc.splitTextToSize(`• ${a}`, pageW - 28);
      doc.text(al, 14, y);
      y += al.length * 5;
    });
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Ready to submit to your nearest police station, bank, or upload to cybercrime.gov.in", 14, pageH - 10);

  doc.save(`upi-shield-complaint-${tx.id.slice(0, 8)}.pdf`);
}