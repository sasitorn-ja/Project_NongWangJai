# แผน: เพิ่ม API `/api/so-orders` และแยกแสดง Full Loop / ไม่ Full Loop ในทุกหน้า

## ความต้องการ

- เพิ่ม API ใหม่ `/api/so-orders` ดึงข้อมูลจาก `https://test-cpac-api.merudy.com/api/ai-wangjai/so-orders`
- Body payload: `{ start_date, end_date, limit: 1000, page: 1 }`
- Filter เฉพาะ `create_form === "Wang Jai"`
- นับยอดรวมจำนวนคิวแยกเป็น 2 แบบ:
  - **Full Loop**: `create_form_wangjai === 1`
  - **ไม่ Full Loop**: `create_form_wangjai === 0`
- ใช้ `CurrentOrderQuantity` เป็นจำนวนคิว
- ใช้ `ShipToCode` map กับ `dealer_code`
- ใช้ date filter ปัจจุบันของ dashboard (`dateFrom`/`dateTo`)
- แสดงผล Full Loop / ไม่ Full Loop ในทุกหน้าที่มีการแสดงจำนวนคิว
- แทนที่ข้อมูล orders ปัจจุบันด้วย SO orders

## สมมติฐาน

1. Upstream endpoint ใช้ **POST** (เนื่องจากมี body payload)
2. `CurrentOrderQuantity` เป็นจำนวนคิว จะ map เป็น `quantity.ordered` และ `quantity.delivered` ของ `OrderItem`
3. `ShipToCode` ตรงกับ `dealer_code` ในระบบ
4. ถ้า `create_form_wangjai` ไม่ใช่ 0 หรือ 1 จะถือว่าเป็น "ไม่ Full Loop"

## Approach

**Big Bang Replace** — แทนที่ `/api/orders` ด้วย `/api/so-orders` ในทุกหน้า พร้อมเพิ่มการคำนวณและแสดง Full Loop / ไม่ Full Loop ในทุกหน้าที่มีคิว

## ไฟล์ที่จะแก้ไข / สร้าง

### Backend

1. `api/so-orders.ts` — สร้างใหม่
2. `api/_shared/cpac-proxy.ts` — แก้ไขถ้าจำเป็น (รองรับ POST)

### Frontend

3. `src/features/dealers/types.ts` — เพิ่ม `OrderItem.full_loop?: boolean`
4. `src/features/dealers/services/endpoints.ts` — แก้ไข `fetchOrders` ให้ POST ไป `/api/so-orders`
5. `src/features/dealers/services/normalize.ts` — เพิ่ม `normalizeSoOrder`
6. `src/features/dealers/services/client.ts` — เพิ่ม helper สำหรับ POST (ถ้าจำเป็น)
7. `src/features/dealers/dashboard/hooks/useDealerDashboardData.ts` — คำนวณ `fullLoopVolume`, `notFullLoopVolume`
8. แก้ไขหน้าต่างๆ ให้แสดง Full Loop / ไม่ Full Loop:
   - `DashboardPage.tsx`
   - `DetailsPage.tsx`
   - `NetworkPage.tsx`
   - `TopCustomersPage.tsx`
   - `TopProductsPage.tsx`
   - `CustomerInsightsPage.tsx`
   - `OrdersPage.tsx`

## ขั้นตอนทดสอบ

1. `npm run build`
2. `npm run dev`
3. ตรวจสอบ filter `create_form === "Wang Jai"`
4. ตรวจสอบ Full Loop / ไม่ Full Loop
5. ตรวจสอบ mapping `ShipToCode` → `dealer`
6. ตรวจสอบทุกหน้าที่แสดงคิว

## ความเสี่ยง

1. SO orders อาจไม่มีข้อมูลบางส่วนที่ orders เดิมมี
2. Mapping `ShipToCode` → `dealer_code` อาจไม่ตรง 100%
3. Upstream endpoint ใช้ POST ต้องปรับ proxy
4. Pagination ถ้าข้อมูลมากกว่า 1000 รายการ
5. `CurrentOrderQuantity` ใช้เป็นทั้ง ordered และ delivered อาจไม่ตรงกับความเป็นจริง
