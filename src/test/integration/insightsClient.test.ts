/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as chai from "chai";
import { expect } from "chai";
import { MappingsClient, MappingCreate, Mapping, MappingSingle } from "./../../reporting";
import "reflect-metadata";
import { getTestRunId, Constants, getTestDIContainer } from "../utils/index";
import { IModelsClient, IModelsClientOptions } from "../imodels-client-authoring/src/IModelsClient";
import { AuthorizationCallback } from "../imodels-client-management/src/IModelsClientExports";
import { TestUtilTypes, TestIModelGroup, TestIModelGroupFactory, IModelMetadata, TestIModelFileProvider, TestAuthorizationProvider, TestIModelCreator, ReusableTestIModelProvider } from "../imodels-client-test-utils/src/iModelsClientTestUtilsExports";

chai.should();
describe("ReportingClient", () => {
  const mappingsClient: MappingsClient = new MappingsClient();
  let accessToken: string;

  let iModelsClient: IModelsClient;
  let authorization: AuthorizationCallback;
  let testIModelGroup: TestIModelGroup;
  let testIModel: IModelMetadata;
  let testIModelFileProvider: TestIModelFileProvider;

  before( async function () {
    this.timeout(0);

    const container = getTestDIContainer();

    const iModelsClientOptions = container.get<IModelsClientOptions>(TestUtilTypes.IModelsClientOptions);
    iModelsClient = new IModelsClient(iModelsClientOptions);
    
    const authorizationProvider = container.get(TestAuthorizationProvider);
    authorization = authorizationProvider.getAdmin1Authorization();
    accessToken = "Bearer " + (await authorization()).token;

    testIModelFileProvider = container.get(TestIModelFileProvider);

    const testIModelGroupFactory = container.get(TestIModelGroupFactory);
    testIModelGroup = testIModelGroupFactory.create({ testRunId: getTestRunId(), packageName: Constants.PackagePrefix, testSuiteName: "ManagementNamedVersionOperations" });

    const testIModelCreator = container.get(TestIModelCreator);
    testIModel = await testIModelCreator.createEmptyAndUploadChangesets(testIModelGroup.getPrefixedUniqueIModelName("Test iModel for write"));

    const reusableTestIModelProvider = container.get(ReusableTestIModelProvider);
    testIModel = await reusableTestIModelProvider.getOrCreate();

  });

  after(async () => {
    await testIModelGroup.cleanupIModels();
  });

  //run tests
  it("MappingsOperations", async function () {
    this.timeout(0);
    let map: MappingCreate = {
      mappingName: "TestMap",
    }
    const created: MappingSingle = await mappingsClient.createMapping(accessToken, testIModel.id, map);
    expect(created).to.not.be.undefined;
    const reports: Array<Mapping> = await mappingsClient.getMappings(accessToken, testIModel.id);
    expect(reports).to.not.be.undefined;
    expect(reports.length).to.be.equals(1);
    const deleted: Response = await mappingsClient.deleteMapping(accessToken, testIModel.id, created.mapping.id);
    expect(deleted.status).to.be.above(199);
    expect(deleted.status).to.be.below(301);
    const reportsEmpty: Array<Mapping> = await mappingsClient.getMappings(accessToken, testIModel.id);
    expect(reportsEmpty).to.not.be.undefined;
    expect(reportsEmpty.length).to.be.equals(0);
  });
});