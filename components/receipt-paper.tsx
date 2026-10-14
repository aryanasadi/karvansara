"use client";

import clsx from "clsx";
import { faNum, faDate, faTime, ORDER_TYPES, PAYMENT_METHODS } from "@/lib/format";
import type { ReceiptSnapshot } from "@/app/dashboard/receipt/actions";

/**
 * The actual paper. Rendered at exact mm widths so a thermal printer
 * (80mm or 58mm roll) prints it without clipping or scaling.
 */
export function ReceiptPaper({ r, id = "receipt-print" }: { r: ReceiptSnapshot; id?: string }) {
  const narrow = r.settings.paperWidth === "58";
  const cur = r.settings.currencyLabel;

  return (
    <div id={id} className={clsx("receipt-paper", narrow ? "receipt-58" : "receipt-80")} dir="rtl">
      {/* header */}
      <div className="r-center">
        {r.settings.showLogo && r.business.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.business.logoUrl}
            alt=""
            style={{ width: narrow ? 40 : 52, height: narrow ? 40 : 52, objectFit: "contain", margin: "0 auto 4px", display: "block" }}
          />
        )}
        <div className="r-bold" style={{ fontSize: narrow ? 13 : 15 }}>
          {r.business.name || "فروشگاه"}
        </div>
        {r.business.phone && <div style={{ fontSize: narrow ? 9 : 10 }}>تلفن: {r.business.phone}</div>}
        {r.business.address && <div style={{ fontSize: narrow ? 9 : 10 }}>{r.business.address}</div>}
        {r.settings.headerText && <div style={{ fontSize: narrow ? 9 : 10, marginTop: 2 }}>{r.settings.headerText}</div>}
      </div>

      <div className="r-divider" />

      {/* meta */}
      <div style={{ fontSize: narrow ? 9.5 : 11 }}>
        <div className="r-row">
          <span>شماره فیش</span>
          <span className="r-bold">{faNum(r.number)}</span>
        </div>
        <div className="r-row">
          <span>تاریخ</span>
          <span>{faDate(r.createdAt)}</span>
        </div>
        <div className="r-row">
          <span>ساعت</span>
          <span>{faTime(r.createdAt)}</span>
        </div>
        <div className="r-row">
          <span>نوع سفارش</span>
          <span>{ORDER_TYPES[r.orderType] ?? r.orderType}</span>
        </div>
        {r.tableNumber && (
          <div className="r-row">
            <span>شماره میز</span>
            <span className="r-bold">{faNum(r.tableNumber)}</span>
          </div>
        )}
        {r.customerName && (
          <div className="r-row">
            <span>مشتری</span>
            <span>{r.customerName}</span>
          </div>
        )}
        {r.customerPhone && (
          <div className="r-row">
            <span>تلفن</span>
            <span>{r.customerPhone}</span>
          </div>
        )}
      </div>

      <div className="r-divider" />

      {/* items */}
      <table style={{ fontSize: narrow ? 9.5 : 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            <th style={{ textAlign: "right" }}>شرح</th>
            <th style={{ width: narrow ? 24 : 30, textAlign: "center" }}>تعداد</th>
            <th style={{ width: narrow ? 52 : 66, textAlign: "left" }}>مبلغ</th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((it, i) => (
            <tr key={i}>
              <td style={{ textAlign: "right", paddingLeft: 4 }}>
                {it.name}
                {it.quantity > 1 && (
                  <div style={{ fontSize: narrow ? 8 : 9, opacity: 0.75 }}>
                    {faNum(it.quantity)} × {faNum(it.unitPrice)}
                  </div>
                )}
              </td>
              <td style={{ textAlign: "center" }}>{faNum(it.quantity)}</td>
              <td style={{ textAlign: "left" }} className="r-bold">
                {faNum(it.quantity * it.unitPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="r-divider" />

      {/* totals */}
      <div style={{ fontSize: narrow ? 9.5 : 11 }}>
        <div className="r-row">
          <span>جمع کل</span>
          <span>{faNum(r.subtotal)}</span>
        </div>
        {r.discount > 0 && (
          <div className="r-row">
            <span>تخفیف</span>
            <span>− {faNum(r.discount)}</span>
          </div>
        )}
        {r.service > 0 && (
          <div className="r-row">
            <span>حق سرویس</span>
            <span>{faNum(r.service)}</span>
          </div>
        )}
        {r.tax > 0 && (
          <div className="r-row">
            <span>مالیات بر ارزش افزوده</span>
            <span>{faNum(r.tax)}</span>
          </div>
        )}
      </div>

      <div className="r-divider" />

      <div className="r-row r-bold" style={{ fontSize: narrow ? 12 : 14 }}>
        <span>قابل پرداخت</span>
        <span>
          {faNum(r.total)} {cur}
        </span>
      </div>

      <div style={{ fontSize: narrow ? 9.5 : 11, marginTop: 4 }}>
        <div className="r-row">
          <span>روش پرداخت</span>
          <span>{PAYMENT_METHODS[r.paymentMethod] ?? r.paymentMethod}</span>
        </div>
        {r.paidAmount > 0 && (
          <>
            <div className="r-row">
              <span>مبلغ دریافتی</span>
              <span>{faNum(r.paidAmount)}</span>
            </div>
            {r.changeAmount > 0 && (
              <div className="r-row r-bold">
                <span>باقی‌مانده (بقیه پول)</span>
                <span>{faNum(r.changeAmount)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {r.note && (
        <>
          <div className="r-divider" />
          <div style={{ fontSize: narrow ? 9 : 10 }}>{r.note}</div>
        </>
      )}

      <div className="r-divider" />

      <div className="r-center" style={{ fontSize: narrow ? 9.5 : 11 }}>
        {r.settings.footerText && <div className="r-bold">{r.settings.footerText}</div>}
        <div style={{ fontSize: narrow ? 8 : 9, marginTop: 4, opacity: 0.8 }}>صادرشده با سامانه کاروانسرا</div>
      </div>

      {/* feed space so the cutter does not eat the last line */}
      <div style={{ height: 18 }} />
    </div>
  );
}

/** Applies the right @page rule then calls the browser print dialog. */
export function printReceipt(paperWidth: string) {
  const body = document.body;
  body.classList.add("printing-receipt", paperWidth === "58" ? "paper-58" : "paper-80");
  const cleanup = () => {
    body.classList.remove("printing-receipt", "paper-58", "paper-80");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Safari/iOS fallback
  setTimeout(cleanup, 3000);
}
