export type Availability = 'available' | 'preorder' | 'sold_out';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Brand {
  id: string; name: string; slug: string; description: string; origin: string; logo_path: string | null;
  is_visible: boolean; is_featured: boolean; sort_order: number;
}
export interface Category {
  id: string; parent_id: string | null; name: string; slug: string; image_path: string | null;
  is_visible: boolean; sort_order: number;
}
export interface ProductRow {
  id: string; name: string; slug: string; price: number | null; price_on_request: boolean; original_price: number | null;
  status: Availability; track_inventory: boolean; stock_quantity: number; reserved_quantity: number;
  is_featured: boolean; created_at: string; brand_name: string | null; brand_slug: string | null;
  category_name: string; category_slug: string; image_path: string | null; total_count: number;
}
export interface Variant {
  id: string; product_id: string; label: string; size: string | null; color: string | null; sku: string | null;
  price: number | null; stock_quantity: number; reserved_quantity: number; position: number;
}
export interface Media {
  id: string; product_id: string; media_type: 'image' | 'video'; bucket: 'product-images' | 'product-videos';
  storage_path: string; mime_type: string; file_size: number; alt_text: string; position: number; is_primary: boolean;
}
export interface ProductFull {
  id: string; name: string; slug: string; brand_id: string | null; category_id: string; subcategory_id: string | null;
  description: string; specifications: string[]; price: number | null; price_on_request: boolean;
  original_price: number | null; sku: string | null; status: Availability; track_inventory: boolean;
  stock_quantity: number; reserved_quantity: number; is_featured: boolean; is_published: boolean;
  created_at: string; updated_at: string;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  subcategory: { name: string; slug: string } | null;
  product_variants: Variant[]; product_media: Media[];
}
export interface Settings {
  store_name: string; tagline: string; whatsapp_number: string; support_email: string;
  announcement_text: string; show_announcement: boolean; inquiry_template: string; preorder_policy: string;
  low_stock_threshold: number;
}
export interface OrderItem {
  id: string; product_id: string | null; product_name: string; brand_name: string; variant_label: string;
  unit_price: number; quantity: number; line_total: number; is_preorder: boolean;
}
export interface Order {
  id: string; reference: string; customer_name: string; customer_phone: string; notes: string; admin_notes: string;
  status: OrderStatus; stock_state: string; total: number; has_preorder: boolean; created_at: string;
  order_items?: OrderItem[];
}
