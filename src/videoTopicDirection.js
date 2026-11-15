import { TOPIC_FACTS } from './claimRules.js';

// Filming direction, not product evidence. The selected topic's live Brain
// registry statement remains the authority for what can be said or demonstrated.
// Topics: wiki/business-context.md §2 and DECISIONS #216 (2026-11-14).
const DIRECTIONS = {
  'feature.waivers':
    'Use an intake or reception area within the chosen business location. Focus on participant signing, not payments or check-in. ' +
    'If a participant is needed, give them a fixed position beside the presenter. Demonstrate typed signing only through real product footage.',
  'feature.guest-self-check-in':
    'Use the guest arrival or reception area. Focus on guests checking in participants on their confirmed booking. ' +
    'A guest may hold their own phone with its screen hidden from camera. Show a real QR code or link only in producer-supplied footage; do not turn this into waiver signing.',
  'feature.gift-vouchers':
    'Use the reception or sales area. Focus the narrative on online gift-voucher purchase and redemption at checkout. ' +
    'Do not invent a printed voucher, discount, balance or code. Any purchase or redemption demonstration uses real product footage.',
  'feature.manage-booking':
    'Use a quiet reception or planning area. Focus on the customer using their manage-booking link to cancel or reschedule under the centre\'s policy. ' +
    'Keep any phone screen hidden in presenter scenes; use real footage for the link and policy workflow. Do not promise a refund outcome.',
  'feature.request-a-time':
    'Use a booking enquiry or planning area. Focus on a preferred-time request reaching staff as a lead. ' +
    'Keep the request distinct from a confirmed booking or a reserved place. Demonstrate the actual request area only in real footage.',
  'feature.session-move-notices':
    'Use a staff planning area in the selected business location. Focus on a moved session and its customer email notice. ' +
    'Do not depict SMS, chat messages or a changing weather/time-of-day montage. Any schedule or email screen must be real footage.',
  'feature.gear-maintenance-hold':
    'Use the equipment service or storage area, with one item of gear set aside for maintenance in a fixed position. ' +
    'Focus on keeping it out of rental until return to service is confirmed; do not show it being handed to a guest during the hold. Product controls require real footage.',
  'feature.direct-card-payments':
    'Use the reception office or administrative desk within the chosen business location. Focus on card payments going to the centre\'s own Stripe account. ' +
    'No money streams, bank-balance animations, cash handovers or invented payment confirmations. Do not add waivers or check-in to the story.',
  'feature.multi-day-trips':
    'Use the trip planning area. Keep the physical scene in one moment while explaining a trip appearing on each day it covers and accommodation room blocks. ' +
    'Use real footage for planner dates and room blocks; do not change daylight to imply days passing or invent external booking-channel connections.',
  'feature.partner-invoices':
    'Use the back-office or partner administration area. Focus on commission invoices from confirmed bookings and their paid or voided status with an audit trail. ' +
    'Use real footage for invoice controls. Do not depict cash exchanges, automatic payouts or invented amounts.',
};

export function videoTopicDirection(topic) {
  return DIRECTIONS[topic.fact_id ?? TOPIC_FACTS[topic.id]] ??
    'Choose a practical working area within the selected business location that directly serves the approved topic. Do not substitute another feature or invent product screens.';
}
