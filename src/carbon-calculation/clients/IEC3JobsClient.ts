/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import type { AccessToken } from "@itwin/core-bentley";
import { EC3Job, EC3JobCreate, EC3JobStatus } from "../interfaces/EC3Jobs";

export interface IEC3JobsClient {
  /**
   * Uploads report data to EC3.
   * @param {string} accessToken OAuth access token with scope `insights:modify`.
   * @param {EC3JobCreate} job Request body.
   * @memberof IEC3JobsClient
   * @link https://developer.bentley.com/apis/carbon-calculation/operations/create-ec3-job/
   */
  createJob(
    accessToken: AccessToken,
    job: EC3JobCreate
  ): Promise<EC3Job>;

  /**
   * Gets EC3 upload job status.
   * @param {string} jobId Unique Identifier of the EC3 Job.
   * @param {string} accessToken OAuth access token with scope `insights:read`.
   * @memberof IEC3JobsClient
   * @link https://developer.bentley.com/apis/carbon-calculation/operations/get-ec3-job-status/
   */
  getEC3JobStatus(
    accessToken: AccessToken,
    jobId: string
  ): Promise<EC3JobStatus>;
}
