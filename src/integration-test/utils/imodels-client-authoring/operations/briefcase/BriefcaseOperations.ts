/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import type { Briefcase, BriefcaseResponse } from "../../../imodels-client-management/base/interfaces/apiEntities/BriefcaseInterfaces";
import { BriefcaseOperations as ManagementBriefcaseOperations } from "../../../imodels-client-management/operations/briefcase/BriefcaseOperations";
import type { OperationOptions } from "../OperationOptions";
import type { AcquireBriefcaseParams, BriefcaseProperties } from "./BriefcaseOperationParams";

export class BriefcaseOperations<TOptions extends OperationOptions> extends ManagementBriefcaseOperations<TOptions> {
  /**
   * Acquires a new Briefcase with specified properties. Wraps the
   * {@link https://developer.bentley.com/apis/imodels/operations/acquire-imodel-briefcase/ Acquire iModel Briefcase}
   * operation from iModels API.
   * @param {AcquireBriefcaseParams} params parameters for this operation. See {@link AcquireBriefcaseParams}.
   * @returns {Promise<Briefcase>} newly acquired Briefcase. See {@link Briefcase}.
   */
  public async acquire(params: AcquireBriefcaseParams): Promise<Briefcase> {
    const acquireBriefcaseBody = this.getAcquireBriefcaseRequestBody(params.briefcaseProperties);
    const acquireBriefcaseResponse = await this.sendPostRequest<BriefcaseResponse>({
      authorization: params.authorization,
      url: this._options.urlFormatter.getBriefcaseListUrl({ iModelId: params.iModelId }),
      body: acquireBriefcaseBody,
    });
    return acquireBriefcaseResponse.briefcase;
  }

  private getAcquireBriefcaseRequestBody(briefcaseProperties: BriefcaseProperties | undefined): Record<string, unknown> | undefined {
    if (!briefcaseProperties) {
      return undefined;
    }

    return {
      deviceName: briefcaseProperties.deviceName,
    };
  }
}
