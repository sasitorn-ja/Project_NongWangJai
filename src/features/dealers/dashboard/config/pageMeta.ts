export type PageKey =
  | "dashboard"
  | "network"
  | "groups"
  | "details"
  | "topCustomers"
  | "topProducts"
  | "customerInsights"
  | "orders";

export function getPageTitle(page: PageKey) {
  if (page === "dashboard") return "Dashboard";
  if (page === "network") return "Dealer Network";
  if (page === "groups") return "Dealer Groups";
  if (page === "details") return "Dealer Details";
  if (page === "topCustomers") return "Top N Dealers";
  if (page === "topProducts") return "Top N Products";
  if (page === "customerInsights") return "Dealer Insights";
  return "Orders";
}

export function getPageSubtitle(page: PageKey) {
  if (page === "dashboard") return "ภาพรวมทุก Dealer";
  if (page === "network") return "แผนผัง dealer network แยกตามภูมิภาคและ dealer สำคัญ";
  if (page === "groups") return "เจาะ Dealer ทีละรายเพื่อดูรายการกลุ่ม";
  if (page === "details") return "Usage, customers และ sites ของแต่ละ Dealer";
  if (page === "topCustomers") {
    return "สรุป Top dealer รายเดือนจากข้อมูล orders โดยไม่ใช้ site_from";
  }
  if (page === "topProducts") {
    return "สรุปสินค้าขายดีรายเดือนจากข้อมูล orders พร้อมรหัสสินค้าและชื่อสินค้า";
  }
  if (page === "customerInsights") {
    return "Top dealer และ site summary จากข้อมูล orders ที่มีอยู่จริง";
  }
  return "รายการ order จากเส้น API จริง";
}
