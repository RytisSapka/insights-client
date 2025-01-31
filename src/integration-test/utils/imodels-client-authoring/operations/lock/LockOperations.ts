/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import type { EntityListIterator } from "../../../../../common/iterators/EntityListIterator";
import { EntityListIteratorImpl } from "../../../../../common/iterators/EntityListIteratorImpl";
import { OperationsBase } from "../../../imodels-client-management/base/OperationsBase";
import type { Lock, LockResponse, LocksResponse } from "../../base/interfaces/apiEntities/LockInterfaces";
import type { OperationOptions } from "../OperationOptions";
import type { GetLockListParams, UpdateLockParams } from "./LockOperationParams";

export class LockOperations<TOptions extends OperationOptions> extends OperationsBase<TOptions> {
  /**
   * Gets Locks for a specific iModel. This method returns Locks in their full representation. The returned iterator
   * internally queries entities in pages. Wraps the
   * {@link https://developer.bentley.com/apis/imodels/operations/get-imodel-locks/ Get iModel Locks} operation from
   * iModels API.
   * @param {GetLockListParams} params parameters for this operation. See {@link GetLockListParams}.
   * @returns {EntityListIterator<Lock>} iterator for Lock list. See {@link EntityListIterator}, {@link Lock}.
   */
  public getList(params: GetLockListParams): EntityListIterator<Lock> {
    return new EntityListIteratorImpl(async () => this.getEntityCollectionPage<Lock>({
      authorization: params.authorization,
      url: this._options.urlFormatter.getLockListUrl({ iModelId: params.iModelId, urlParams: params.urlParams }),
      entityCollectionAccessor: (response: unknown) => (response as LocksResponse).locks,
    }));
  }

  /**
   * Updates Lock for a specific Briefcase. This operation is used to acquire new locks and change the lock level for
   * already existing ones. Wraps the {@link https://developer.bentley.com/apis/imodels/operations/update-imodel-locks/
   * Update iModel Locks} operation from iModels API.
   * @param {UpdateLockParams} params parameters for this operation. See {@link UpdateLockParams}.
   * @returns {Promise<Lock>} updated Lock. See {@link Lock}.
   */
  public async update(params: UpdateLockParams): Promise<Lock> {
    const updateLockBody = this.getUpdateLockBody(params);
    const updateLockResponse = await this.sendPatchRequest<LockResponse>({
      authorization: params.authorization,
      url: this._options.urlFormatter.getLockListUrl({ iModelId: params.iModelId }),
      body: updateLockBody,
    });
    return updateLockResponse.lock;
  }

  private getUpdateLockBody(params: UpdateLockParams): Record<string, unknown> {
    return {
      briefcaseId: params.briefcaseId,
      changesetId: params.changesetId,
      lockedObjects: params.lockedObjects,
    };
  }
}
