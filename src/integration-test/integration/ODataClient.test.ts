/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as chaiAsPromised from "chai-as-promised";
import { expect, use } from "chai";
import { ExtractionClient, ExtractionStatus, ExtractorState, GroupCreate, MappingCreate, MappingsClient, ODataClient, ODataItem, ReportCreate, ReportMappingCreate, ReportsClient } from "../../reporting";
import "reflect-metadata";
import { accessToken, projectId, sleep, testIModel, testIModelGroup } from "../utils";
use(chaiAsPromised);

describe("OData Client", () => {
  const oDataClient: ODataClient = new ODataClient();
  const reportsClient: ReportsClient = new ReportsClient();
  const mappingsClient: MappingsClient = new MappingsClient();
  const extractionClient: ExtractionClient = new ExtractionClient();

  let reportId: string;
  let oDataItem: ODataItem;
  let mappingId: string;

  before(async () => {
    const newMapping: MappingCreate = {
      mappingName: "Test",
    };
    const mapping = await mappingsClient.createMapping(accessToken, testIModel.id, newMapping);
    expect(mapping).to.not.be.undefined;
    expect(mapping.mappingName).to.be.eq("Test");
    mappingId = mapping.id;

    const newGroup: GroupCreate = {
      groupName: "Test",
      query: "select * from biscore.element limit 10",
    };
    const group = await mappingsClient.createGroup(accessToken, testIModel.id, mapping.id, newGroup);
    expect(group).to.not.be.undefined;
    expect(group.groupName).to.be.eq("Test");

    const newReport: ReportCreate = {
      displayName: "Test",
      projectId,
    };
    const report = await reportsClient.createReport(accessToken, newReport);
    expect(report).to.not.be.undefined;
    expect(report.displayName).to.be.eq("Test");
    reportId = report.id;

    const newReportMapping: ReportMappingCreate = {
      mappingId: mapping.id,
      imodelId: testIModel.id,
    };
    const reportMapping = await reportsClient.createReportMapping(accessToken, report.id, newReportMapping);
    expect(reportMapping).to.not.be.undefined;
    expect(reportMapping.mappingId).to.be.eq(mapping.id);

    const extraction = await extractionClient.runExtraction(accessToken, testIModel.id);
    expect(extraction).to.not.be.undefined;

    let state = ExtractorState.Queued;
    let status: ExtractionStatus;
    for (const start = performance.now(); performance.now() - start < 6 * 60 * 1000; await sleep(3000)) {
      status = await extractionClient.getExtractionStatus(accessToken, extraction.id);
      state = status.state;
      if(state !== ExtractorState.Queued && state.valueOf() !== ExtractorState.Running)
        break;
    }
    expect(state).to.be.eq(ExtractorState.Succeeded);

    const oDataResponse = await oDataClient.getODataReport(accessToken, reportId);
    expect(oDataResponse).to.not.be.undefined;
    expect(oDataResponse.value).to.not.be.empty;
    oDataItem = oDataResponse.value[0];

  });

  after(async () => {
    await mappingsClient.deleteMapping(accessToken, testIModel.id, mappingId);
    await reportsClient.deleteReport(accessToken, reportId);

    await testIModelGroup.cleanupIModels();
  });

  it("get OData report", async () => {
    const oDataResponse = await oDataClient.getODataReport(accessToken, reportId);
    expect(oDataResponse).to.not.be.undefined;
    expect(oDataResponse["@odata.context"]).to.not.be.empty;
  });

  it("get OData report metadata", async () => {
    const oDataResponse = await oDataClient.getODataReportMetadata(accessToken, reportId);
    expect(oDataResponse).to.not.be.undefined;
    expect(oDataResponse).to.not.be.empty;
    expect(oDataResponse[0].name).to.not.be.empty;
  });

  it("throw OData report metadata", async () => {
    await expect(oDataClient.getODataReportMetadata(accessToken, "-")).to.be.rejected;
  });

  it("get OData report entity", async () => {
    const oDataEntity = await oDataClient.getODataReportEntities(accessToken, reportId, oDataItem);
    expect(oDataEntity).to.not.be.undefined;
    expect(oDataEntity).to.not.be.empty;
  });

  it("get OData report entity page", async () => {
    const oDataEntity = await oDataClient.getODataReportEntityPage(accessToken, reportId, oDataItem, 0);
    expect(oDataEntity).to.not.be.undefined;
    expect(oDataEntity).to.not.be.empty;
  });
});

