/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import type { AccessToken } from "@itwin/core-bentley";

import type {
  CalculatedProperty,
  CalculatedPropertyCollection,
  CalculatedPropertyCreate,
  CalculatedPropertySingle,
  CalculatedPropertyUpdate,
} from "./CalculatedProperties";
import type {
  CustomCalculation,
  CustomCalculationCollection,
  CustomCalculationCreate,
  CustomCalculationSingle,
  CustomCalculationUpdate,
} from "./CustumCalculations";
import type {
  Group,
  GroupCollection,
  GroupCreate,
  GroupSingle,
  GroupUpdate,
} from "./Groups";
import type {
  GroupProperty,
  GroupPropertyCollection,
  GroupPropertyCreate,
  GroupPropertySingle,
  GroupPropertyUpdate,
} from "./GroupProperties";
import type {
  ExtractionLog,
  ExtractionLogCollection,
  ExtractionRun,
  ExtractionStatusSingle,
} from "./ExtractionProcess";
import type {
  Mapping,
  MappingCollection,
  MappingCopy,
  MappingCreate,
  MappingSingle,
  MappingUpdate,
} from "./Mappings";
import type {
  ODataEntityResponse,
  ODataItem,
  ODataResponse,
} from "./OData";
import type {
  Report,
  ReportCollection,
  ReportCreate,
  ReportMapping,
  ReportMappingCollection,
  ReportMappingCreate,
  ReportMappingSingle,
  ReportSingle,
  ReportUpdate,
} from "./Reports";
import {
  DataAccessApi,
  ExtractionApi,
  MappingsApi,
  REPORTING_BASE_PATH,
  ReportsApi,
} from "./generated/api";
import { PagedResponseLinks } from "./Links";
import isomorphicFetch from 'cross-fetch';

const BASE_PATH = 'https://api.bentley.com/insights/reporting'.replace(
  /\/+$/,
  '',
);

interface collection {
  values: Array<any>;
  _links: PagedResponseLinks;
}

const ACCEPT = "application/vnd.bentley.itwin-platform.v1+json";

// To be only used within Viewer
export class ReportingClient {
  private _dataAccessApi: DataAccessApi;
  private _mappingsApi: MappingsApi;
  private _reportsApi: ReportsApi;
  private _extractionApi: ExtractionApi;
  constructor(baseUrl?: string) {
    const reportingBaseUrl = baseUrl ?? REPORTING_BASE_PATH;
    this._dataAccessApi = new DataAccessApi(undefined, reportingBaseUrl);
    this._mappingsApi = new MappingsApi(undefined, reportingBaseUrl);
    this._reportsApi = new ReportsApi(undefined, reportingBaseUrl);
    this._extractionApi = new ExtractionApi(undefined, reportingBaseUrl);
  }

  /**
   * Creates an abstract async generator to loop through collections
   * @param {Async Function} getNextBatch function that specifies what data to retrieve
   * @memberof ReportingClient
   */
  private genericIterator<T>(getNextBatch: (nextUrl: string | undefined) => Promise<collection>): {
    [Symbol.asyncIterator]: () => AsyncGenerator<T, void, unknown>;
  } {
    return {
      [Symbol.asyncIterator]: async function*() {
        let response: collection;
        let i: number = 0;
        let nextUrl: string | undefined;

        do {
          response = await getNextBatch(nextUrl);
          while(i < response.values.length) {
            yield response.values[i++];
          }
          i = 0;
          if (!response._links?.next?.href) {
            continue;
          }
          nextUrl = response._links?.next?.href;
        } while (response._links?.next?.href);
        return;
      },
    };
  }

  /**
   * Creates a request body and headers
   * @param {string} operation string specifying which opperation will be performed
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {string} content request body
   * @memberof ReportingClient
   */
  private createRequest(operation: string, accessToken: string, content?: string): RequestInit {
    const request: any = {
      method: operation,
      headers: {
        Authorization: String(accessToken),
        Accept: String(ACCEPT),
      }};
    if(content) {
      request.headers['Content-Type'] = "application/json";
      request.body = content;
    }
    return request;
  }

  /**
   * retrieves specified data
   * @param {string} nextUrl url for the fetch
   * @param {RequestInit} requestOptions information about the fetch
   * @memberof ReportingClient
   */
  private async fetch(nextUrl: RequestInfo, requestOptions: RequestInit) {
    return isomorphicFetch(
      nextUrl,
      requestOptions
    ).then((response) => {
      if (response.status >= 200 && response.status < 300) {
        if(response.status === 204)
          return response;
        return response.json();
      } else {
        throw response;
      }
    });
  }

  /**
   * Lists all OData Entities for a Report.
   * @param {string} reportId The Report Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/odata/
   */
  public async getODataReport(accessToken: AccessToken, reportId: string): Promise<ODataResponse> {
    const url = `${BASE_PATH}/odata/${encodeURIComponent(reportId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  // TODO: figure out what to do with this
  /**
   * Lists the raw table data for a Report Entity.
   * @param {string} reportId The Report Id.
   * @param {ODataItem} odataItem Reference to a table exported to your Report. Use {@link getODataReport()} to fetch a list of ODataItems in the report.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/odata-entity/
   */
  public async getODataReportEntity(accessToken: AccessToken, reportId: string, odataItem: ODataItem) {
    const segments = odataItem?.url?.split('/');
    if (segments?.length !== 3) {
      return undefined;
    }
    let sequence = 0;

    const reportData: Array<{[key: string]: string}> = [];
    let response: ODataEntityResponse;

    do {
      response = await this._dataAccessApi.odataEntity(
        reportId,
        segments[0],
        segments[1],
        segments[2],
        sequence,
        accessToken
      );
      response.value && reportData.push(...response.value);
      sequence++;
    } while (response["@odata.nextLink"]);

    return reportData;
  }

  /**
   * Lists schemas for all Entities tied to a Report.
   * @param {string} reportId The Report Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/odata-metadata/
   */
  public async getODataReportMetadata(accessToken: AccessToken, reportId: string): Promise<Response> {
    const url = `${BASE_PATH}/odata/${encodeURIComponent(reportId)}/$metadata`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return isomorphicFetch(url, requestOptions).then((response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      } else {
        throw response;
      }
    });
  }

  /**
   * Gets Logs of an Extraction Run.
   * @param {string} jobId Unique Identifier of the Extraction Run.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-extraction-logs/
   */
  public async getExtractionLogs(accessToken: AccessToken, jobId: string, top?: number) {
    const logs: Array<ExtractionLog> = [];
    const logIterator = this.getExtractionLogsAsync(accessToken, jobId, top);
    for await(const log of logIterator) {
      logs.push(log);
    }
    return logs;
  }

  /**
   * Gets an async iterator for Logs of an Extraction Run.
   * @param {string} jobId Unique Identifier of the Extraction Run.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getExtractionLogsAsync(accessToken: AccessToken, jobId: string, top?: number): {
    [Symbol.asyncIterator]: () => AsyncGenerator<ExtractionLog, void, unknown>;
  } {
    return this.genericIterator<ExtractionLog>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/datasources/extraction/status/${encodeURIComponent(jobId)}/logs`;
          if(top !== undefined) {
            nextUrl += `/?%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: ExtractionLogCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.logs,
          _links: response._links,
        };
      });
  }

  /**
   * Manually run Extraction of data from an iModel.
   * @param {string} imodelId The iModel Id.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/run-extraction/
   */
  public runExtraction(accessToken: AccessToken, iModelId: string): Promise<ExtractionRun> {
    const url = `${BASE_PATH}/datasources/imodels/${iModelId}/extraction/run`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets the Status of an Extraction Run.
   * @param {string} jobId Unique Identifier of the Extraction Run.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-extraction-status/
   */
  public async getExtractionStatus(accessToken: AccessToken, jobId: string): Promise<ExtractionStatusSingle> {
    const url = `${BASE_PATH}/datasources/extraction/status/${encodeURIComponent(jobId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets all Reports within the context of a Project.
   * @param {string} projectId The Project Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-project-reports/
   */
  public async getReports(accessToken: AccessToken, projectId: string, top?: number) {
    const reports: Array<Report> = [];
    const reportIterator = this.getReportsAsync(accessToken, projectId, top);
    for await(const report of reportIterator) {
      reports.push(report);
    }
    return reports;
  }

  /**
   * Gets an async iterator for the Reports of a Project
   * @param {string} projectId The Project Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getReportsAsync(accessToken: AccessToken, projectId: string, top?: number): {
    [Symbol.asyncIterator]: () => AsyncGenerator<Report, void, unknown>;
  } {
    return this.genericIterator<Report>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/reports?projectId=${encodeURIComponent(projectId)}`;
          if(top !== undefined) {
            nextUrl += `&%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: ReportCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.reports,
          _links: response._links,
        };
      });
  }

  /**
   * Gets a single Report.
   * @param {string} reportId The Report Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-report/
   */
  public async getReport(accessToken: AccessToken, reportId: string): Promise<ReportSingle> {
    const url = `${BASE_PATH}/reports/${encodeURIComponent(reportId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Creates a Report within the context of a Project.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {ReportCreate} report Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/create-report/
   */
  public async createReport(accessToken: AccessToken, report: ReportCreate): Promise<ReportSingle>{
    const url = `${BASE_PATH}/reports/`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken, JSON.stringify(report || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Updates a Report.
   * @param {string} reportId Id of the Report to be updated.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {ReportUpdate} report Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/update-report/
   */
  public async updateReport(accessToken: AccessToken, reportId: string, report: ReportUpdate): Promise<ReportSingle> {
    const url = `${BASE_PATH}/reports/${encodeURIComponent(reportId)}`;
    const requestOptions: RequestInit = this.createRequest("PATCH", accessToken, JSON.stringify(report || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Marks a Report for deletetion.
   * @param {string} reportId Id of the Report to be deleted.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/delete-report/
   */
  public async deleteReport(accessToken: AccessToken, reportId: string) {
    const url = `${BASE_PATH}/reports/${encodeURIComponent(reportId)}`;
    const requestOptions: RequestInit = this.createRequest("DELETE", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets all Report Mappings for a Report.
   * @param {string} reportId The Report Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-report-mappings/
   */
  public async getReportMappings(accessToken: AccessToken, reportId: string, top?: number) {
    const reportMappings: Array<ReportMapping> = [];
    const reportMappingIterator = this.getReportMappingsAsync(accessToken, reportId, top);
    for await(const reportMapping of reportMappingIterator) {
      reportMappings.push(reportMapping);
    }
    return reportMappings;
  }

  /**
   * Gets an async iterator for Report Mappings for a Report.
   * @param {string} reportId The Report Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getReportMappingsAsync(accessToken: AccessToken, reportId: string, top?: number): {
    [Symbol.asyncIterator]: () => AsyncGenerator<ReportMapping, void, unknown>;
  } {
    return this.genericIterator<ReportMapping>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/reports/${encodeURIComponent(reportId)}/datasources/imodelMappings`;
          if(top !== undefined) {
            nextUrl += `/?%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: ReportMappingCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.mappings,
          _links: response._links,
        };
      });
  }

  /**
   * Creates a Report Mapping.
   * @param {string} reportId The Report Id.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {ReportMappingCreate} reportMapping Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/create-report-mapping/
   */
  public async createReportMapping(
    accessToken: AccessToken,
    reportId: string,
    reportMapping: ReportMappingCreate
  ): Promise<ReportMappingSingle> {
    const url = `${BASE_PATH}/reports/${encodeURIComponent(reportId)}/datasources/imodelMappings`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken, JSON.stringify(reportMapping || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Deletes a Report Mapping from a Report.
   * @param {string} reportId The Report Id.
   * @param {string} mappingId Id of the Report Mapping to be deleted.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/delete-report-mapping/
   */
  public async deleteReportMapping(accessToken: AccessToken, reportId: string, reportMappingId: string) {
    const url = `${BASE_PATH}/reports/${encodeURIComponent(reportId)}/datasources/imodelMappings/${encodeURIComponent(reportMappingId)}`;
    const requestOptions: RequestInit = this.createRequest("DELETE", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets all Mappings for an iModel.
   * @param {string} imodelId The iModel Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-mappings/
   */
  public async getMappings(accessToken: AccessToken, iModelId: string, top?: number) {
    const mappings: Array<Mapping> = [];
    const mapIterator = this.getMappingsAsync(accessToken, iModelId, top);
    for await(const map of mapIterator) {
      mappings.push(map);
    }
    return mappings;
  }

  /**
   * Gets an async iterator for Mappings for an iModel.
   * @param {string} imodelId The iModel Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getMappingsAsync(accessToken: AccessToken, iModelId: string, top?: number): {
    [Symbol.asyncIterator]: () => AsyncGenerator<Mapping, void, unknown>;
  } {
    return this.genericIterator<Mapping>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings`;
          if(top !== undefined) {
            nextUrl += `/?%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: MappingCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.mappings,
          _links: response._links,
        };
      });
  }

  /**
   * Gets a Mapping for an iModel.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-mapping/
   */
  public async getMapping(accessToken: AccessToken, iModelId: string, mappingId: string): Promise<MappingSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Creates a Mapping for an iModel.
   * @param {string} imodelId Id of the iModel for which to create a new Mapping.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {MappingCreate} mapping Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/create-mapping/
   */
  public async createMapping(
    accessToken: AccessToken,
    iModelId: string,
    mapping: MappingCreate
  ): Promise<MappingSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken, JSON.stringify(mapping || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Updates a Mapping for an iModel.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId Id of the Mapping to be updated.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {MappingUpdate} mapping Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/update-mapping/
   */
  public async updateMapping(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    mapping: MappingUpdate
  ): Promise<MappingSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}`;
    const requestOptions: RequestInit = this.createRequest("PATCH", accessToken, JSON.stringify(mapping || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Deletes a Mapping for an iModel.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId Id of the Mapping to be deleted.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/delete-mapping/
   */
  public async deleteMapping(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string
  ) {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}`;
    const requestOptions: RequestInit = this.createRequest("DELETE", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Copies a Mapping and all its Groups, GroupProperties, CalculatedProperties, and CustomCalculations to a target iModel.
   * @param {string} imodelId Id of the source Mapping&#x27;s iModel.
   * @param {string} mappingId Id of the source Mapping.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {MappingCopy} mappingCopy Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/copy-mapping/
   */
  public async copyMapping(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    mappingCopy: MappingCopy
  ) {
    const url = `/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/copy`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken, JSON.stringify(mappingCopy || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets all Groups for a Mapping.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-groups/
   */
  public async getGroups(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    top?: number
  ) {
    const groups: Array<Group> = [];

    const groupIterator = this.getGroupsAsync(accessToken, iModelId, mappingId, top);
    for await(const group of groupIterator) {
      groups.push(group);
    }
    return groups;
  }

  /**
   * Gets an async iterator for all Groups of a Mapping.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getGroupsAsync(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    top?: number):
    {
      [Symbol.asyncIterator]: () => AsyncGenerator<Group, void, unknown>;
    } {
    return this.genericIterator<Group>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups`;
          if(top !== undefined) {
            nextUrl += `/?%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: GroupCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.groups,
          _links: response._links,
        };
      });
  }

  /**
   * Creates a Group for an iModel data source Mapping.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId Id of the Mapping for which to create a new Group.
   * @param {string} AccessToken OAuth access token with scope `insights:modify`
   * @param {GroupCreate} group Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/create-group/
   */
  public async createGroup(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    group: GroupCreate
  ): Promise<GroupSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups`;
    const requestOptions: RequestInit =  this.createRequest("POST", accessToken, JSON.stringify(group || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets a Group for a Mapping.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-group/
   */
  public async getGroup(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string
  ): Promise<GroupSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Updates a Group for a Mapping.
   * @param {string} imodelId Globally Unique Identifier of the target iModel.
   * @param {string} mappingId Globally Unique Identifier of the target Mapping.
   * @param {string} groupId Id of the Group to be updated.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {GroupUpdate} group Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/update-group/
   */
  public async updateGroup(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    group: GroupUpdate
  ): Promise<GroupSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}`;
    const requestOptions: RequestInit = this.createRequest("PATCH", accessToken, JSON.stringify(group || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Deletes a Group for a Mapping.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId Id of the Group to be deleted.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/delete-group/
   */
  public async deleteGroup(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string
  ) {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}`;
    const requestOptions: RequestInit = this.createRequest("DELETE", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets all GroupProperties for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-groupproperties/
   */
  public async getGroupProperties(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    top?: number
  ) {
    const properties: Array<GroupProperty> = [];

    const groupPropertyIterator = this.getGroupPropertiesAsync(accessToken, iModelId, mappingId, groupId, top);
    for await(const groupProperty of groupPropertyIterator) {
      properties.push(groupProperty);
    }
    return properties;
  }

  /**
   * Gets an async iterator for all GroupProperties of a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getGroupPropertiesAsync(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    top?: number
  ): {
      [Symbol.asyncIterator]: () => AsyncGenerator<GroupProperty, void, unknown>;
    } {
    return this.genericIterator<GroupProperty>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/properties`;
          if(top !== undefined) {
            nextUrl += `/?%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: GroupPropertyCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.properties,
          _links: response._links,
        };
      });
  }

  /**
   * Gets a GroupProperty for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} propertyId The GroupProperty Id.
   * @param {string} accessToken access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-groupproperty/
   */
  public async getGroupProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string
  ): Promise<GroupPropertySingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/properties/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Creates a GroupProperty for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId Id of the Group for which to create a new GroupProperty.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {GroupPropertyCreate} groupProperty Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/create-groupproperty/
   */
  public async createGroupProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    groupProperty: GroupPropertyCreate
  ): Promise<GroupPropertySingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/properties`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken, JSON.stringify(groupProperty || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Updates a GroupProperty for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} propertyId Id of the GroupProperty to be updated.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {GroupPropertyUpdate} groupProperty Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/update-groupproperty/
   */
  public async updateGroupProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string,
    groupProperty: GroupPropertyUpdate
  ): Promise<GroupPropertySingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/properties/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("PUT", accessToken, JSON.stringify(groupProperty || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Deletes a GroupProperty from a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} propertyId Id of the GroupProperty to be deleted.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/delete-groupproperty/
   */
  public async deleteGroupProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string
  ) {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/properties/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("DELETE", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets all CalculatedProperties for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-calculatedproperties/
   */
  public async getCalculatedProperties(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    top?: number
  ) {
    const properties: Array<CalculatedProperty> = [];

    const calculatedPropertyIterator = this.getCalculatedPropertiesAsync(accessToken, iModelId, mappingId, groupId, top);
    for await(const calculatedProperty of calculatedPropertyIterator) {
      properties.push(calculatedProperty);
    }
    return properties;
  }

  /**
   * Gets an async iterator for all CalculatedProperties of a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getCalculatedPropertiesAsync(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    top?: number
  ): {
      [Symbol.asyncIterator]: () => AsyncGenerator<CalculatedProperty, void, unknown>;
    } {
    return this.genericIterator<CalculatedProperty>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/calculatedProperties`;
          if(top !== undefined) {
            nextUrl += `/?%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: CalculatedPropertyCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.properties,
          _links: response._links,
        };
      });
  }

  /**
   * Gets a CalculatedProperty for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} propertyId The CalculatedProperty Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-calculatedproperty/
   */
  public async getCalculatedProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string
  ): Promise<CalculatedPropertySingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/calculatedProperties/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Creates a CalculatedProperty for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId Id of the Group for which to create a new CalculatedProperty.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {CalculatedPropertyCreate} property Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/create-calculatedproperty/
   */
  public async createCalculatedProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    property: CalculatedPropertyCreate
  ): Promise<CalculatedPropertySingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/calculatedProperties`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken, JSON.stringify(property || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Updates a CalculatedProperty for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} propertyId Id of the CalculatedProperty to be updated.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {CalculatedPropertyUpdate} property Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/update-calculatedproperty/
   */
  public async updateCalculatedProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string,
    property: CalculatedPropertyUpdate
  ): Promise<CalculatedPropertySingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/calculatedProperties/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("PATCH", accessToken, JSON.stringify(property || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Deletes a CalculatedProperty from a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} propertyId Id of the CalculatedProperty to be deleted.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/delete-calculatedproperty/
   */
  public async deleteCalculatedProperty(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string
  ) {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/calculatedProperties/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("DELETE", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Gets all CustomCalculations for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-customcalculations/
   */
  public async getCustomCalculations(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    top?: number
  ) {
    const customCalculations: Array<CustomCalculation> = [];

    const customCalculationsIterator = this.getCustomCalculationsAsync(accessToken, iModelId, mappingId, groupId, top);
    for await(const customCalculation of customCalculationsIterator) {
      customCalculations.push(customCalculation);
    }
    return customCalculations;
  }

  /**
   * Gets an async iterator for all CustomCalculations of a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @param {number} top the number of entities to pre-load.
   * @memberof ReportingClient
   */
  public getCustomCalculationsAsync(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    top?: number
  ): {
      [Symbol.asyncIterator]: () => AsyncGenerator<CustomCalculation, void, unknown>;
    } {
    return this.genericIterator<CustomCalculation>(
      async (nextUrl: string | undefined): Promise<collection> => {
        if(nextUrl === undefined) {
          nextUrl = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/customCalculations`;
          if(top !== undefined) {
            nextUrl += `/?%24top=${top}`;
          }
        }
        const requestOptions: RequestInit = this.createRequest("GET", accessToken);
        const response: CustomCalculationCollection = await this.fetch(nextUrl, requestOptions);
        return {
          values: response.customCalculations,
          _links: response._links,
        };
      });
  }

  /**
   * Gets a CustomCalculation for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} propertyId The CustomCalculation Id.
   * @param {string} accessToken OAuth access token with scope `insights:read`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/get-customcalculation/
   */
  public async getCustomCalculation(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string
  ): Promise<CustomCalculationSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/customCalculations/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("GET", accessToken);
    return this.fetch(url, requestOptions);
  }

  /**
   * Creates a CustomCalculation for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId Id of the Group for which to create a new CustomCalculation.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {CustomCalculationCreate} property Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/create-customcalculation/
   */
  public async createCustomCalculation(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    property: CustomCalculationCreate
  ): Promise<CustomCalculationSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/customCalculations`;
    const requestOptions: RequestInit = this.createRequest("POST", accessToken, JSON.stringify(property || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Updates a CustomCalculation for a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} customCalculationId Id of the CustomCalculation to be updated.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @param {CustomCalculationUpdate} property Request body.
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/update-customcalculation/
   */
  public async updateCustomCalculation(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string,
    property: CustomCalculationUpdate
  ): Promise<CustomCalculationSingle> {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/customCalculations/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("PATCH", accessToken, JSON.stringify(property || {}));
    return this.fetch(url, requestOptions);
  }

  /**
   * Deletes a CustomCalculation from a Group.
   * @param {string} imodelId The iModel Id.
   * @param {string} mappingId The Mapping Id.
   * @param {string} groupId The Group Id.
   * @param {string} customCalculationId Id of the CustomCalculation to be deleted.
   * @param {string} accessToken OAuth access token with scope `insights:modify`
   * @memberof ReportingClient
   * @link https://developer.bentley.com/apis/insights/operations/delete-customcalculation/
   */
  public async deleteCustomCalculation(
    accessToken: AccessToken,
    iModelId: string,
    mappingId: string,
    groupId: string,
    propertyId: string
  ) {
    const url = `${BASE_PATH}/datasources/imodels/${encodeURIComponent(iModelId)}/mappings/${encodeURIComponent(mappingId)}/groups/${encodeURIComponent(groupId)}/customCalculations/${encodeURIComponent(propertyId)}`;
    const requestOptions: RequestInit = this.createRequest("DELETE", accessToken);
    return this.fetch(url, requestOptions);
  }
}
