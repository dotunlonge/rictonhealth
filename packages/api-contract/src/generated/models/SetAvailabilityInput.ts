/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SetAvailabilityInput = {
  /**
   * 0=Monday..6=Sunday, evaluated in UTC
   */
  dayOfWeek: number;
  /**
   * Window start, UTC HH:MM
   */
  startTime: string;
  /**
   * Window end, UTC HH:MM
   */
  endTime: string;
  slotDurationMinutes?: number;
  isActive?: boolean;
};
