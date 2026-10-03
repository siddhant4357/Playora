export const CATEGORY_LABEL: Record<string, string> = {
  RACKET: "Rackets",
  BALL: "Balls",
  SHOES: "Shoes",
  ACCESSORY: "Accessories",
  APPAREL: "Apparel",
  SERVICE: "Services",
  FOOD: "Food",
  BEVERAGE: "Drinks",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PAID: "New",
  PREPARING: "Picking",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const FULFILMENT_LABEL: Record<string, string> = {
  TAKEAWAY: "Counter",
  CLICK_COLLECT: "Click & collect",
  DELIVERY: "Home delivery",
};

export const JOB_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Received",
  IN_PROGRESS: "In progress",
  READY: "Ready",
  COLLECTED: "Collected",
};
