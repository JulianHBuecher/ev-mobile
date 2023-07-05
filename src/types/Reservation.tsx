import { ReservationAuthorizationActions } from './Authorization';
import { Car } from './Car';
import ChargingStation from './ChargingStation';
import CreatedUpdatedProps from './CreatedUpdatedProps';
import Tag from './Tag';

export default interface Reservation extends CreatedUpdatedProps, ReservationAuthorizationActions {
  id: number;
  chargingStationID: string;
  chargingStation?: ChargingStation;
  connectorID: number;
  fromDate?: Date;
  toDate?: Date;
  expiryDate: Date;
  arrivalTime?: Date;
  idTag: string;
  visualTagID?: string;
  tag?: Tag;
  parentIdTag?: string;
  carID?: string;
  car?: Car;
  type: ReservationType;
  status?: ReservationStatusEnum;
}

export enum ReservationStatus {
  DONE = 'reservation_done',
  SCHEDULED = 'reservation_scheduled',
  IN_PROGRESS = 'reservation_in_progress',
  CANCELLED = 'reservation_cancelled',
  EXPIRED = 'reservation_expired',
}

export enum ReservationType {
  PLANNED_RESERVATION = 'planned_reservation',
  RESERVE_NOW = 'reserve_now',
}

export type ReservationStatusEnum = ReservationStatus;

export type ReservationStatusTransition = Readonly<{
  from?: ReservationStatusEnum;
  to: ReservationStatusEnum;
}>;
