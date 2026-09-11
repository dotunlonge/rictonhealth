/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TelemedicineRoom = {
  id: string;
  appointmentId: string | null;
  providerId: string;
  roomType: 'ONE_ON_ONE' | 'MDT';
  externalRoomId: string;
  externalRoomUrl: string | null;
  status: 'CREATED' | 'ACTIVE' | 'ENDED';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
