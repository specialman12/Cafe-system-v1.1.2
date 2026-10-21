import mongoose, { Schema, Model } from "mongoose";
import {
  Category as ICategoryType,
  MenuItem as IMenuItemType,
  Order as IOrderType,
  TableInfo as ITableInfoType,
  Customer as ICustomerType,
} from "../types";

/* =========================================================================
 * 1. USER INTERFACE & SCHEMA
 * ========================================================================= */
export interface IUser {
  username: string;
  password?: string;
  name: string;
  email?: string;
  role: "admin" | "manager" | "waiter" | "kitchen" | "cashier" | "staff";
  pin?: string;
  active: boolean;
  avatar?: string;
  phone?: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, select: false },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: {
      type: String,
      enum: ["admin", "manager", "waiter", "kitchen", "cashier", "staff"],
      default: "staff",
    },
    pin: { type: String },
    active: { type: Boolean, default: true },
    avatar: { type: String, default: "" },
    phone: { type: String, default: "" },
    permissions: [{ type: String }],
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* =========================================================================
 * 2. CATEGORY INTERFACE & SCHEMA
 * ========================================================================= */
export interface ICategory extends ICategoryType {
  createdAt?: string;
  updatedAt?: string;
}

export const CategorySchema = new Schema<ICategory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    descriptionEn: { type: String, default: "" },
    icon: { type: String, default: "Utensils" },
    image: { type: String, default: "" },
    order: { type: Number, default: 0 },
    scheduleEnabled: { type: Boolean, default: false },
    scheduleStartTime: { type: String, default: "" },
    scheduleEndTime: { type: String, default: "" },
    scheduleAction: {
      type: String,
      enum: ["pin_to_top", "show_only"],
      default: "pin_to_top",
    },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* =========================================================================
 * 3. MENU ITEM INTERFACE & SCHEMA
 * ========================================================================= */
export interface IMenuItem extends IMenuItemType {
  createdAt?: string;
  updatedAt?: string;
}

export const MenuItemSchema = new Schema<IMenuItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    categoryId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    descriptionEn: { type: String, default: "" },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true, index: true },
    isPopular: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    calories: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* =========================================================================
 * 4. ORDER INTERFACE & SCHEMA
 * ========================================================================= */
export interface IOrder extends IOrderType {
  updatedAt?: string;
}

const CartItemSchema = new Schema(
  {
    menuItem: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      nameEn: { type: String, default: "" },
      price: { type: Number, required: true },
      categoryId: { type: String, default: "" },
      image: { type: String, default: "" },
      available: { type: Boolean, default: true },
      calories: { type: Number, default: 0 },
    },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

export const OrderSchema = new Schema<any>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tableNumber: { type: Number, required: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    total: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    discountAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "delivered", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
    billRequested: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["cash", "card"],
      default: "cash",
    },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    deliveredAt: { type: String, default: "" },
    checkSent: { type: Boolean, default: false },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* =========================================================================
 * 5. TABLE INTERFACE & SCHEMA
 * ========================================================================= */
export interface ITable extends ITableInfoType {
  createdAt?: string;
  updatedAt?: string;
}

const TableTransferRequestSchema = new Schema(
  {
    fromDeviceId: { type: String, required: true },
    fromCustomerName: { type: String, default: "" },
    requestedAt: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { _id: false }
);

export const TableSchema = new Schema<ITable>(
  {
    tableNumber: { type: Number, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["available", "busy", "bill_requested"],
      default: "available",
      index: true,
    },
    currentOrderId: { type: String, default: "" },
    seatedAt: { type: String, default: "" },
    firstOrderAt: { type: String, default: "" },
    name: { type: String, default: "" },
    capacity: { type: Number, default: 4 },
    section: { type: String, default: "" },
    activeSessionDeviceId: { type: String, default: "" },
    activeSessionCustomerName: { type: String, default: "" },
    lastActiveHeartbeat: { type: Number, default: 0 },
    billRequestedAt: { type: String, default: "" },
    billRequested: { type: Boolean, default: false },
    tableDelivered: { type: Boolean, default: false },
    deliveredAt: { type: String, default: "" },
    sessionTransferRequest: { type: TableTransferRequestSchema, default: null },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* =========================================================================
 * 6. CUSTOMER INTERFACE & SCHEMA
 * ========================================================================= */
export interface ICustomer extends ICustomerType {
  updatedAt?: string;
}

export const CustomerSchema = new Schema<any>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, index: true, trim: true },
    notes: { type: String, default: "" },
    lastTable: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastVisit: { type: String, default: () => new Date().toISOString() },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* =========================================================================
 * 🚀 EXPORT MONGOOSE MODELS (Safe for dev & server runtime)
 * ========================================================================= */
export const UserModel: Model<IUser> =
  (mongoose.models && mongoose.models.User) || mongoose.model<IUser>("User", UserSchema);

export const CategoryModel: Model<ICategory> =
  (mongoose.models && mongoose.models.Category) || mongoose.model<ICategory>("Category", CategorySchema);

export const MenuItemModel: Model<IMenuItem> =
  (mongoose.models && mongoose.models.MenuItem) || mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);

export const OrderModel: Model<IOrder> =
  (mongoose.models && mongoose.models.Order) || mongoose.model<IOrder>("Order", OrderSchema);

export const TableModel: Model<ITable> =
  (mongoose.models && mongoose.models.Table) || mongoose.model<ITable>("Table", TableSchema);

export const CustomerModel: Model<ICustomer> =
  (mongoose.models && mongoose.models.Customer) || mongoose.model<ICustomer>("Customer", CustomerSchema);
