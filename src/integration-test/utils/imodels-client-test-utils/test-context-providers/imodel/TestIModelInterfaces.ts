/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import type { IModelsClient } from "../../../imodels-client-authoring/IModelsClient";
import type { Lock } from "../../../imodels-client-authoring/base/interfaces/apiEntities/LockInterfaces";
import type { AuthorizationParam } from "../../../imodels-client-management/base/interfaces/CommonInterfaces";

export interface BriefcaseMetadata {
  id: number;
  deviceName: string;
}

export interface NamedVersionMetadata {
  id: string;
  name: string;
  changesetId: string;
  changesetIndex: number;
}

export interface IModelMetadata {
  id: string;
  name: string;
  description: string;
}

export interface ReusableIModelMetadata extends IModelMetadata {
  briefcase: BriefcaseMetadata;
  namedVersions: NamedVersionMetadata[];
  lock: Lock;
}

export interface TestIModelSetupContext extends AuthorizationParam {
  iModelsClient: IModelsClient;
}

export interface IModelIdentificationByNameParams {
  projectId: string;
  iModelName: string;
}

export interface IModelIdParam {
  iModelId: string;
}
