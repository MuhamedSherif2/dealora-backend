export const ROLES = ['client', 'agent', 'admin'];
export const LANGUAGES = ['ar', 'en'];

// Gulf countries (ISO 3166-1 alpha-2)
export const COUNTRIES = ['AE', 'SA', 'KW', 'QA', 'BH', 'OM'];
export const CURRENCIES = ['AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR', 'USD'];

export const PROPERTY_TYPES = [
  'apartment', 'villa', 'townhouse', 'penthouse', 'studio', 'duplex',
  'office', 'shop', 'warehouse', 'land', 'building',
];
export const PURPOSES = ['sale', 'rent'];
export const RENT_PERIODS = ['yearly', 'monthly', 'weekly', 'daily'];
export const AREA_UNITS = ['sqm', 'sqft'];
export const FURNISHING = ['furnished', 'semi_furnished', 'unfurnished'];
export const COMPLETION = ['ready', 'off_plan'];
export const PROPERTY_STATUS = ['available', 'reserved', 'sold', 'rented'];

export const LEAD_STATUS = ['new', 'contacted', 'viewing_scheduled', 'negotiating', 'won', 'lost'];
export const LEAD_SOURCES = ['website', 'whatsapp', 'facebook', 'instagram', 'chatbot', 'phone', 'other'];

export const VIEWING_STATUS = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
// allowed status transitions for a viewing
export const VIEWING_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const NOTIFY_CHANNELS = ['whatsapp', 'email'];

// how a buyer can pay for a listing (a property can accept several)
export const PAYMENT_METHODS = ['cash', 'installments', 'mortgage'];

// channels we log when a message was sent to a lead (we only log THAT we sent, not the content)
export const COMM_CHANNELS = ['whatsapp', 'email'];

// 'pending' = n8n has not saved the matching results yet, 'ready' = saved (even if no property matched)
export const MATCHING_STATUS = ['pending', 'ready'];

// the customer's results link stops working this many days after the lead was created
export const PUBLIC_RESULTS_TTL_DAYS = 30;

export const WEBHOOK_STATUS = ['pending', 'success', 'failed', 'skipped'];
export const EVENTS = {
  LEAD_CREATED: 'lead.created',
  LEAD_STATUS_CHANGED: 'lead.status_changed',
  VIEWING_REQUESTED: 'viewing.requested',
  VIEWING_STATUS_CHANGED: 'viewing.status_changed',
  PROPERTY_CREATED: 'property.created',
  PROPERTY_STATUS_CHANGED: 'property.status_changed',
  USER_REGISTERED: 'user.registered',
  PASSWORD_RESET_REQUESTED: 'password.reset_requested',
};