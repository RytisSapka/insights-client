/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { inject, injectable } from "inversify";
import type { GetSingleCheckpointParams, Lock, LockedObjects } from "../../../imodels-client-authoring/IModelsClientExports";
import { LockLevel } from "../../../imodels-client-authoring/base/interfaces/apiEntities/LockInterfaces";
import { CheckpointState } from "../../../imodels-client-management/base/interfaces/apiEntities/CheckpointInterfaces";
import { sleep, TestSetupError } from "../../CommonTestUtils";
import { TestAuthorizationProvider } from "../auth/TestAuthorizationProvider";
import { TestProjectProvider } from "../project/TestProjectProvider";
import { TestIModelFileProvider } from "./TestIModelFileProvider";
import type { BriefcaseMetadata, IModelMetadata, NamedVersionMetadata, ReusableIModelMetadata } from "./TestIModelInterfaces";
import { TestIModelsClient } from "./TestIModelsClient";

@injectable()
export class TestIModelCreator {
  public static namedVersions = [
    { name: "Named version 5", changesetIndex: 5 },
    { name: "Named version 10", changesetIndex: 10 },
  ];

  private readonly _iModelDescription = "Some description";
  private readonly _briefcaseDeviceName = "Some device name";

  constructor(
    @inject(TestIModelsClient)
    private readonly _iModelsClient: TestIModelsClient,
    @inject(TestAuthorizationProvider)
    private readonly _testAuthorizationProvider: TestAuthorizationProvider,
    @inject(TestProjectProvider)
    private readonly _testProjectProvider: TestProjectProvider,
    @inject(TestIModelFileProvider)
    private readonly _testIModelFileProvider: TestIModelFileProvider
  ) { }

  public async createEmpty(iModelName: string): Promise<IModelMetadata> {
    const projectId = await this._testProjectProvider.getOrCreate();
    const iModel = await this._iModelsClient.iModels.createEmpty({
      authorization: this._testAuthorizationProvider.getAdmin1Authorization(),
      iModelProperties: {
        projectId,
        name: iModelName,
        description: this._iModelDescription,
      },
    });

    return {
      id: iModel.id,
      name: iModel.name,
      description: iModel.description ?? "",
    };
  }

  public async createEmptyAndUploadChangesets(iModelName: string): Promise<IModelMetadata> {
    const iModel = await this.createEmpty(iModelName);
    const briefcase = await this.acquireBriefcase(iModel.id);
    await this.uploadChangesets(iModel.id, briefcase.id);
    return iModel;
  }

  public async createReusable(iModelName: string): Promise<ReusableIModelMetadata> {
    const iModel = await this.createEmpty(iModelName);
    const briefcase = await this.acquireBriefcase(iModel.id);
    await this.uploadChangesets(iModel.id, briefcase.id);
    const namedVersions = await this.createNamedVersionsOnReusableIModel(iModel.id);
    const lock = await this.createLockOnReusableIModel(iModel.id, briefcase.id);

    return {
      ...iModel,
      briefcase,
      namedVersions,
      lock,
    };
  }

  private async createNamedVersionsOnReusableIModel(iModelId: string): Promise<NamedVersionMetadata[]> {
    const namedVersions: NamedVersionMetadata[] = [];
    const checkpointGenerationPromises: Promise<void>[] = [];
    for (const namedVersionMetadata of TestIModelCreator.namedVersions) {
      const namedVersion: NamedVersionMetadata = await this.createNamedVersionOnChangesetIndex(
        iModelId,
        namedVersionMetadata.name,
        namedVersionMetadata.changesetIndex
      );
      namedVersions.push(namedVersion);
      checkpointGenerationPromises.push(
        this.waitForNamedVersionCheckpointGenerated(iModelId, namedVersion.id)
      );
    }

    await Promise.all(checkpointGenerationPromises);
    return namedVersions;
  }

  private async createLockOnReusableIModel(iModelId: string, briefcaseId: number): Promise<Lock> {
    const testIModelLocks: LockedObjects[] = [
      {
        lockLevel: LockLevel.Exclusive,
        objectIds: ["0x1", "0xa"],
      },
      {
        lockLevel: LockLevel.Shared,
        objectIds: ["0x2", "0xb"],
      },
    ];

    const acquiredLocks: Lock = await this._iModelsClient.locks.update({
      authorization: this._testAuthorizationProvider.getAdmin1Authorization(),
      iModelId,
      briefcaseId,
      lockedObjects: testIModelLocks,
    });

    return acquiredLocks;
  }

  public async uploadChangesets(iModelId: string, briefcaseId: number): Promise<void> {
    for (let i = 0; i < this._testIModelFileProvider.changesets.length; i++) {
      await this._iModelsClient.changesets.create({
        authorization: this._testAuthorizationProvider.getAdmin1Authorization(),
        iModelId,
        changesetProperties: {
          briefcaseId,
          description: this._testIModelFileProvider.changesets[i].description,
          containingChanges: this._testIModelFileProvider.changesets[i].containingChanges,
          id: this._testIModelFileProvider.changesets[i].id,
          parentId: i === 0
            ? undefined
            : this._testIModelFileProvider.changesets[i - 1].id,
          synchronizationInfo: this._testIModelFileProvider.changesets[i].synchronizationInfo,
          filePath: this._testIModelFileProvider.changesets[i].filePath,
        },
      });
    }
  }

  private async acquireBriefcase(iModelId: string): Promise<BriefcaseMetadata> {
    const briefcase = await this._iModelsClient.briefcases.acquire({
      authorization: this._testAuthorizationProvider.getAdmin1Authorization(),
      iModelId,
      briefcaseProperties: {
        deviceName: this._briefcaseDeviceName,
      },
    });

    return {
      id: briefcase.briefcaseId,
      deviceName: briefcase.deviceName ?? "",
    };
  }

  private async createNamedVersionOnChangesetIndex(iModelId: string, namedVersionName: string, changesetIndex: number): Promise<NamedVersionMetadata> {
    // We use this specific user that is able to generate checkpoints
    // for named version creation to mimic production environment.
    const authorizationForFullyFeaturedUser = this._testAuthorizationProvider.getFullyFeaturedAdmin2Authorization();

    const changesetMetadata = this._testIModelFileProvider.changesets[changesetIndex - 1];
    const namedVersion = await this._iModelsClient.namedVersions.create({
      authorization: authorizationForFullyFeaturedUser,
      iModelId,
      namedVersionProperties: {
        name: namedVersionName,
        changesetId: changesetMetadata.id,
      },
    });
    return {
      id: namedVersion.id,
      name: namedVersion.name,
      changesetId: changesetMetadata.id,
      changesetIndex: changesetMetadata.index,
    };
  }

  private async waitForNamedVersionCheckpointGenerated(iModelId: string, namedVersionId: string): Promise<void> {
    const getSingleCheckpointParams: GetSingleCheckpointParams = {
      authorization: this._testAuthorizationProvider.getAdmin1Authorization(),
      iModelId,
      namedVersionId,
    };
    const sleepPeriodInMs = 1000;
    const timeOutInMs = 5 * 60 * 1000;
    for (let retries = timeOutInMs / sleepPeriodInMs; retries > 0; --retries) {
      const checkpoint = await this._iModelsClient.checkpoints.getSingle(getSingleCheckpointParams);

      // eslint-disable-next-line @typescript-eslint/naming-convention
      if (checkpoint.state === CheckpointState.Successful && checkpoint._links?.download !== undefined && checkpoint.containerAccessInfo !== null) {
        return;
      }

      if (checkpoint.state !== CheckpointState.Scheduled && checkpoint.state !== CheckpointState.Successful) {
        throw new TestSetupError(`Checkpoint generation failed with state: ${checkpoint.state}.`);
      }

      await sleep(sleepPeriodInMs);
    }

    throw new TestSetupError("Timed out while waiting for checkpoint generation to complete.");
  }
}
