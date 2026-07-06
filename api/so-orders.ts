import { findSoOrders } from "./_shared/repositories/soOrders.js";
import type { DbSoOrder } from "./_shared/repositories/soOrders.js";

type SoOrderItem = {
  so_id: number;
  project_id?: number | null;
  qo_id?: number | null;
  truck_queue_id?: number | null;
  SaleOrderID?: string | null;
  TempSaleOrderID?: string | null;
  SaleOrderNum?: number | null;
  DispatchCode?: string | null;
  ShipToCompCode?: string | null;
  ShipToCode: string;
  ShipToName?: string | null;
  ShipToLat?: string | null;
  ShipToLng?: string | null;
  SoldToCode?: string | null;
  SoldToName?: string | null;
  SoldToMobile?: string | null;
  SoldToTelephone?: string | null;
  SoldToSaleType?: string | null;
  SubSoldToCode?: string | null;
  SubSoldToName?: string | null;
  SubSoldToMobile?: string | null;
  SubSoldToTelephone?: string | null;
  InitialOrderQuantity?: number | null;
  CurrentOrderQuantity: number;
  ApproveOrderQuantity?: number | null;
  CurrentStatus?: string | null;
  BookByName?: string | null;
  BookByPhoneNumber?: string | null;
  DocumentDate?: string | null;
  DeliveryDateTime?: string | null;
  TruckType?: string | null;
  TruckService?: string | null;
  UnloadID?: string | null;
  UnloadMethod?: string | null;
  UnloadTimeDurationPerTruck?: string | null;
  Memo?: string | null;
  InternalNote?: string | null;
  TransportRateQuantity?: number | null;
  TransportRateTime?: number | null;
  RequestQcSamplingConcrete?: string | null;
  RequestQcServiceOnSite?: string | null;
  QcPersonNumber?: string | null;
  FranchiseeCode?: string | null;
  MaterialCode?: string | null;
  MaterialDescription?: string | null;
  CompGroup?: string | null;
  SaleOrderType?: string | null;
  StructureID?: string | null;
  StructureName?: string | null;
  groupline_id?: number | null;
  create_form_wangjai: number;
  create_form: string | null;
  created_at?: string | null;
  modify_at?: string | null;
};

function formatLatLng(value: number | null): string | null {
  if (value == null) return null;
  return String(value);
}

function mapDbToApi(row: DbSoOrder): SoOrderItem {
  return {
    so_id: row.so_id,
    project_id: row.project_id,
    qo_id: row.qo_id,
    truck_queue_id: row.truck_queue_id,
    SaleOrderID: row.sale_order_id,
    TempSaleOrderID: row.temp_sale_order_id,
    SaleOrderNum: row.sale_order_num,
    DispatchCode: row.dispatch_code,
    ShipToCompCode: row.ship_to_comp_code,
    ShipToCode: row.ship_to_code,
    ShipToName: row.ship_to_name,
    ShipToLat: formatLatLng(row.ship_to_lat),
    ShipToLng: formatLatLng(row.ship_to_lng),
    SoldToCode: row.sold_to_code,
    SoldToName: row.sold_to_name,
    SoldToMobile: row.sold_to_mobile,
    SoldToTelephone: row.sold_to_telephone,
    SoldToSaleType: row.sold_to_sale_type,
    SubSoldToCode: row.sub_sold_to_code,
    SubSoldToName: row.sub_sold_to_name,
    SubSoldToMobile: row.sub_sold_to_mobile,
    SubSoldToTelephone: row.sub_sold_to_telephone,
    InitialOrderQuantity: row.initial_order_quantity,
    CurrentOrderQuantity: row.current_order_quantity,
    ApproveOrderQuantity: row.approve_order_quantity,
    CurrentStatus: row.current_status,
    BookByName: row.book_by_name,
    BookByPhoneNumber: row.book_by_phone_number,
    DocumentDate: row.document_date,
    DeliveryDateTime: row.delivery_date_time,
    TruckType: row.truck_type,
    TruckService: row.truck_service,
    UnloadID: row.unload_id,
    UnloadMethod: row.unload_method,
    UnloadTimeDurationPerTruck: row.unload_time_duration_per_truck,
    Memo: row.memo,
    InternalNote: row.internal_note,
    TransportRateQuantity: row.transport_rate_quantity,
    TransportRateTime: row.transport_rate_time,
    RequestQcSamplingConcrete: row.request_qc_sampling_concrete,
    RequestQcServiceOnSite: row.request_qc_service_on_site,
    QcPersonNumber: row.qc_person_number,
    FranchiseeCode: row.franchisee_code,
    MaterialCode: row.material_code,
    MaterialDescription: row.material_description,
    CompGroup: row.comp_group,
    SaleOrderType: row.sale_order_type,
    StructureID: row.structure_id,
    StructureName: row.structure_name,
    groupline_id: row.groupline_id,
    create_form_wangjai: row.create_form_wangjai,
    create_form: row.create_form,
    created_at: row.api_created_at,
    modify_at: row.api_modified_at
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      start_date?: string;
      end_date?: string;
      limit?: number;
      page?: number;
    };

    const startDate = body.start_date ?? "";
    const endDate = body.end_date ?? "";
    const limit = Math.max(1, Math.min(1000, Number(body.limit) || 1000));
    const page = Math.max(1, Number(body.page) || 1);


    const { items, total } = await findSoOrders({ startDate, endDate, limit, page });
    const totalPage = Math.ceil(total / limit);

    return Response.json({
      status: true,
      items: items.map(mapDbToApi),
      total,
      page,
      limit,
      totalPage,
      message: "success"
    });
  } catch (error) {
    console.error("Failed to load SO orders from database", { error });

    const message = error instanceof Error ? error.message : "Unknown database error";

    return Response.json(
      { status: false, items: [], total: 0, page: 1, limit: 1000, totalPage: 0, message },
      { status: 500 }
    );
  }
}
